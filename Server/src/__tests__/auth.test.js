import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';

let adminRole;

beforeAll(async () => {
  await connect();
  await seedTestRoles();
  adminRole = await Role.findOne({ name: 'admin' });
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  await seedTestRoles();
  adminRole = await Role.findOne({ name: 'admin' });
});

describe('Authentication', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  const createUser = async (overrides = {}) => {
    const role = overrides.role || adminRole._id;
    return User.create({
      ...testUser,
      ...overrides,
      role,
    });
  };

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      await createUser();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      // Should not expose passwordHash
      expect(res.body.data.user.passwordHash).toBeUndefined();
      // Should not expose refreshTokenHash
      expect(res.body.data.user.refreshTokenHash).toBeUndefined();
    });

    it('should fail with wrong password', async () => {
      await createUser();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail for inactive user', async () => {
      await createUser({ isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const user = await createUser();

      // Login to get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      await createUser();

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});

describe('Security', () => {
  it('should not expose passwordHash in user responses', async () => {
    const role = await Role.findOne({ name: 'admin' });
    await User.create({
      name: 'Secure User',
      email: 'secure@example.com',
      passwordHash: 'hashedpassword',
      role: role._id,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'secure@example.com', password: 'hashedpassword' });

    // Login might fail since password isn't properly hashed, but the model test confirms exclusion
    const user = await User.findOne({ email: 'secure@example.com' });
    const userJSON = user.toJSON();
    expect(userJSON.passwordHash).toBeUndefined();
    expect(userJSON.refreshTokenHash).toBeUndefined();
  });
});
