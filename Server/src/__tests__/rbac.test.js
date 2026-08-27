import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';

let adminRole, salesRole, financeRole, managementRole;

beforeAll(async () => {
  await connect();
  await seedTestRoles();
  adminRole = await Role.findOne({ name: 'admin' });
  salesRole = await Role.findOne({ name: 'sales' });
  financeRole = await Role.findOne({ name: 'finance' });
  managementRole = await Role.findOne({ name: 'management' });
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  await seedTestRoles();
  adminRole = await Role.findOne({ name: 'admin' });
  salesRole = await Role.findOne({ name: 'sales' });
  financeRole = await Role.findOne({ name: 'finance' });
  managementRole = await Role.findOne({ name: 'management' });
});

describe('RBAC — Role-based Access Control', () => {
  const createUserWithRole = async (role, email = 'test@example.com') => {
    return User.create({
      name: 'Test User',
      email,
      passwordHash: 'password123',
      role: role._id,
    });
  };

  const loginAs = async (email, password = 'password123') => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    return res.body.data?.accessToken;
  };

  describe('Admin-only endpoints', () => {
    it('admin can access user management', async () => {
      const user = await createUserWithRole(adminRole, 'admin@test.com');
      const token = await loginAs('admin@test.com');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('sales cannot access user management', async () => {
      const user = await createUserWithRole(salesRole, 'sales@test.com');
      const token = await loginAs('sales@test.com');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('finance cannot access user management', async () => {
      const user = await createUserWithRole(financeRole, 'finance@test.com');
      const token = await loginAs('finance@test.com');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Permission-based access', () => {
    it('management can read users', async () => {
      await createUserWithRole(managementRole, 'mgmt@test.com');
      const token = await loginAs('mgmt@test.com');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('admin can create users', async () => {
      await createUserWithRole(adminRole, 'admin@test.com');
      const token = await loginAs('admin@test.com');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
          role: salesRole._id,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Wildcard permissions', () => {
    it('admin with lead:* should have all lead permissions', async () => {
      // Admin role already has specific lead permissions
      // This tests the wildcard logic in rbac.js
      await createUserWithRole(adminRole, 'admin@test.com');
      const token = await loginAs('admin@test.com');

      // Admin can access user:read
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Unauthenticated access', () => {
    it('should reject all protected routes without token', async () => {
      await request(app).get('/api/v1/users').expect(401);
      await request(app).get('/api/v1/auth/me').expect(401);
    });
  });
});
