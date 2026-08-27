import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';

let adminRole, managementRole, salesRole;
let adminUser, managementUser, salesUserA, salesUserB;
let adminToken, managementToken, salesTokenA, salesTokenB;

beforeAll(async () => {
  await connect();
  await seedTestRoles();
  adminRole = await Role.findOne({ name: 'admin' });
  managementRole = await Role.findOne({ name: 'management' });
  salesRole = await Role.findOne({ name: 'sales' });
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  await seedTestRoles();

  adminRole = await Role.findOne({ name: 'admin' });
  managementRole = await Role.findOne({ name: 'management' });
  salesRole = await Role.findOne({ name: 'sales' });

  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: adminRole._id });
  managementUser = await User.create({ name: 'Manager', email: 'manager@test.com', password: 'password123', role: managementRole._id });
  salesUserA = await User.create({ name: 'Sales A', email: 'salesa@test.com', password: 'password123', role: salesRole._id });
  salesUserB = await User.create({ name: 'Sales B', email: 'salesb@test.com', password: 'password123', role: salesRole._id });

  adminToken = await loginAs('admin@test.com');
  managementToken = await loginAs('manager@test.com');
  salesTokenA = await loginAs('salesa@test.com');
  salesTokenB = await loginAs('salesb@test.com');
});

async function loginAs(email) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

async function createClient(overrides = {}, token = adminToken) {
  return request(app)
    .post('/api/v1/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      companyName: 'Test Corp',
      primaryContact: { name: 'John Doe', email: 'john@test.com', phone: '+1234567890' },
      ...overrides,
    });
}

// ─── CRUD Tests ──────────────────────────────────────────────────────────────

describe('Clients — CRUD', () => {
  it('should create a client', async () => {
    const res = await createClient();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyName).toBe('Test Corp');
    expect(res.body.data.status).toBe('active');
  });

  it('should get a single client', async () => {
    const createRes = await createClient();
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.companyName).toBe('Test Corp');
  });

  it('should update a client', async () => {
    const createRes = await createClient();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Updated Corp' });

    expect(res.status).toBe(200);
    expect(res.body.data.companyName).toBe('Updated Corp');
  });

  it('should delete a client (admin)', async () => {
    const createRes = await createClient();
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject delete by sales user', async () => {
    const createRes = await createClient({ accountOwner: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(403);
  });
});

// ─── Duplicate Protection Tests ──────────────────────────────────────────────

describe('Clients — Duplicate Protection', () => {
  it('should reject duplicate company name', async () => {
    await createClient({ companyName: 'Acme Corp' });

    const res = await createClient({ companyName: 'Acme Corp' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CLIENT');
  });

  it('should reject duplicate company name (case-insensitive)', async () => {
    await createClient({ companyName: 'Acme Corp' });

    const res = await createClient({ companyName: 'acme corp' });
    expect(res.status).toBe(409);
  });

  it('should allow updating to a non-duplicate name', async () => {
    const createRes = await createClient({ companyName: 'Acme Corp' });
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Acme Industries' });

    expect(res.status).toBe(200);
    expect(res.body.data.companyName).toBe('Acme Industries');
  });
});

// ─── Search & Filter Tests ───────────────────────────────────────────────────

describe('Clients — Search & Filter', () => {
  beforeEach(async () => {
    await createClient({ companyName: 'Acme Corp' });
    await createClient({ companyName: 'Beta Inc' });
    await createClient({ companyName: 'Acme Solutions', status: 'inactive' });
  });

  it('should search clients by company name', async () => {
    const res = await request(app)
      .get('/api/v1/clients?search=Acme')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/v1/clients?status=inactive')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('inactive');
  });

  it('should paginate', async () => {
    const res = await request(app)
      .get('/api/v1/clients?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(3);
  });
});

// ─── Client 360 Tests ────────────────────────────────────────────────────────

describe('Clients — 360 View', () => {
  it('should return client 360 with opportunities and activities', async () => {
    const clientRes = await createClient();
    const clientId = clientRes.body.data._id;

    // Create an opportunity for this client
    await request(app)
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Client Opportunity', value: 50000, client: clientId });

    // Create an activity for this client
    await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'meeting', relatedTo: { type: 'Client', id: clientId }, description: 'Quarterly review' });

    const res = await request(app)
      .get(`/api/v1/clients/${clientId}/360`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.client.companyName).toBe('Test Corp');
    expect(res.body.data.opportunities.length).toBe(1);
    expect(res.body.data.recentActivities.length).toBe(1);
    expect(res.body.data.stats.totalOpportunities).toBe(1);
  });

  it('should return 404 for non-existent client', async () => {
    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .get(`/api/v1/clients/${fakeId}/360`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Ownership & Authorization Tests ─────────────────────────────────────────

describe('Clients — Ownership & Authorization', () => {
  it('should allow sales user to update own client', async () => {
    const createRes = await createClient({ accountOwner: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ companyName: 'Updated by owner' });

    expect(res.status).toBe(200);
  });

  it('should deny sales user updating another sales user client', async () => {
    const createRes = await createClient({ accountOwner: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${salesTokenB}`)
      .send({ companyName: 'Unauthorized' });

    expect(res.status).toBe(403);
  });

  it('should allow management to update any client', async () => {
    const createRes = await createClient({ accountOwner: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/clients/${id}`)
      .set('Authorization', `Bearer ${managementToken}`)
      .send({ companyName: 'Updated by management' });

    expect(res.status).toBe(200);
  });
});
