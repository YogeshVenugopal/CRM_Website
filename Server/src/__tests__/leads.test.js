import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Lead from '../modules/leads/lead.model.js';

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

  // Create test users
  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: adminRole._id });
  managementUser = await User.create({ name: 'Manager', email: 'manager@test.com', password: 'password123', role: managementRole._id });
  salesUserA = await User.create({ name: 'Sales A', email: 'salesa@test.com', password: 'password123', role: salesRole._id });
  salesUserB = await User.create({ name: 'Sales B', email: 'salesb@test.com', password: 'password123', role: salesRole._id });

  // Login all users
  adminToken = await loginAs('admin@test.com');
  managementToken = await loginAs('manager@test.com');
  salesTokenA = await loginAs('salesa@test.com');
  salesTokenB = await loginAs('salesb@test.com');
});

async function loginAs(email) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

async function createLead(overrides = {}, token = adminToken) {
  const res = await request(app)
    .post('/api/v1/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Lead',
      company: 'Test Corp',
      email: 'lead@test.com',
      source: 'website',
      ...overrides,
    });
  return res;
}

// ─── CRUD Tests ──────────────────────────────────────────────────────────────

describe('Leads — CRUD', () => {
  it('should create a lead', async () => {
    const res = await createLead();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Lead');
    expect(res.body.data.status).toBe('new');
    expect(res.body.data.createdBy).toBeDefined();
  });

  it('should get a single lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Lead');
  });

  it('should update a lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Lead' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Lead');
  });

  it('should delete a lead (admin)', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Verify deleted
    const getRes = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);
  });

  it('should reject delete by sales user', async () => {
    const createRes = await createLead({}, adminToken);
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(403);
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── Search & Filter Tests ───────────────────────────────────────────────────

describe('Leads — Search & Filter', () => {
  beforeEach(async () => {
    await createLead({ name: 'Acme Corp', company: 'Acme', source: 'website' }, adminToken);
    await createLead({ name: 'Beta Inc', company: 'Beta', source: 'referral' }, adminToken);
    await createLead({ name: 'Acme Solutions', company: 'Acme Solutions', source: 'ads' }, adminToken);
  });

  it('should search leads by name', async () => {
    const res = await request(app)
      .get('/api/v1/leads?search=Acme')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/v1/leads?status=new')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
  });

  it('should filter by source', async () => {
    const res = await request(app)
      .get('/api/v1/leads?source=website')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].source).toBe('website');
  });

  it('should paginate leads', async () => {
    const res = await request(app)
      .get('/api/v1/leads?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(2);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(2);
  });
});

// ─── Assignment Tests ────────────────────────────────────────────────────────

describe('Leads — Assignment', () => {
  it('should assign a lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: salesUserA._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.lead.assignedTo).toBe(salesUserA._id.toString());
  });

  it('should reject assignment to inactive user', async () => {
    const inactive = await User.create({ name: 'Inactive', email: 'inactive@test.com', password: 'password123', role: salesRole._id, isActive: false });

    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: inactive._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNMENT');
  });

  it('should reject assignment to non-existent user', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: fakeId });

    expect(res.status).toBe(400);
  });
});

// ─── Status Transition Tests ─────────────────────────────────────────────────

describe('Leads — Status Transitions', () => {
  it('should transition new → contacted', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'contacted' });

    expect(res.status).toBe(200);
    expect(res.body.data.lead.status).toBe('contacted');
    expect(res.body.data.previousStatus).toBe('new');
  });

  it('should reject invalid transition new → qualified', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'qualified' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_LEAD_STATUS_TRANSITION');
  });

  it('should reject transition converted → new', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    // Move to contacted → qualified → converted
    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'contacted' });
    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'qualified' });
    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'converted' });

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'new' });

    expect(res.status).toBe(400);
  });
});

// ─── Qualification Tests ─────────────────────────────────────────────────────

describe('Leads — Qualification', () => {
  it('should qualify a contacted lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    // Move to contacted
    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'contacted' });

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/qualify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lead.status).toBe('qualified');
  });

  it('should reject qualifying a new lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/qualify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── Conversion Tests ────────────────────────────────────────────────────────

describe('Leads — Conversion', () => {
  it('should convert a qualified lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    // Move to contacted → qualified
    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'contacted' });
    await request(app).patch(`/api/v1/leads/${leadId}/qualify`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lead.status).toBe('converted');
  });

  it('should reject converting a non-qualified lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_LEAD_STATUS_TRANSITION');
  });

  it('should reject converting an already-converted lead', async () => {
    const createRes = await createLead();
    const leadId = createRes.body.data._id;

    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'contacted' });
    await request(app).patch(`/api/v1/leads/${leadId}/qualify`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/leads/${leadId}/convert`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LEAD_ALREADY_CONVERTED');
  });
});

// ─── Ownership & Authorization Tests ─────────────────────────────────────────

describe('Leads — Ownership & Authorization', () => {
  it('should allow sales user to update own lead', async () => {
    const createRes = await createLead({ assignedTo: salesUserA._id.toString() }, adminToken);
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ name: 'Updated by owner' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated by owner');
  });

  it('should deny sales user updating another sales user lead', async () => {
    const createRes = await createLead({ assignedTo: salesUserA._id.toString() }, adminToken);
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${salesTokenB}`)
      .send({ name: 'Unauthorized update' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LEAD_ACCESS_DENIED');
  });

  it('should allow management to update any lead', async () => {
    const createRes = await createLead({ assignedTo: salesUserA._id.toString() }, adminToken);
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${managementToken}`)
      .send({ name: 'Updated by management' });

    expect(res.status).toBe(200);
  });

  it('should allow admin to update any lead', async () => {
    const createRes = await createLead({ assignedTo: salesUserA._id.toString() }, adminToken);
    const leadId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated by admin' });

    expect(res.status).toBe(200);
  });

  it('should allow sales user to view assigned leads', async () => {
    await createLead({ name: 'My Lead', assignedTo: salesUserA._id.toString() }, adminToken);
    await createLead({ name: 'Other Lead', assignedTo: salesUserB._id.toString() }, adminToken);

    const res = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    // Sales user should only see their own leads
    const names = res.body.data.map((l) => l.name);
    expect(names).toContain('My Lead');
  });

  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/leads');
    expect(res.status).toBe(401);
  });

  it('should reject finance user from accessing leads', async () => {
    const financeRole = await Role.findOne({ name: 'finance' });
    const financeUser = await User.create({ name: 'Finance', email: 'finance@test.com', password: 'password123', role: financeRole._id });
    const financeToken = await loginAs('finance@test.com');

    const res = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(403);
  });
});
