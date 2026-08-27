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
let testLead;

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

  // Create a qualified lead
  const leadRes = await request(app)
    .post('/api/v1/leads')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Lead', company: 'Test Corp', assignedTo: salesUserA._id.toString() });

  testLead = leadRes.body.data;

  // Move to contacted → qualified
  await request(app).patch(`/api/v1/leads/${testLead._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'contacted' });
  await request(app).patch(`/api/v1/leads/${testLead._id}/qualify`).set('Authorization', `Bearer ${adminToken}`);
});

async function loginAs(email) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

async function createOpportunity(overrides = {}, token = adminToken) {
  return request(app)
    .post('/api/v1/opportunities')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Opportunity',
      value: 100000,
      currency: 'INR',
      probability: 30,
      ...overrides,
    });
}

// ─── CRUD Tests ──────────────────────────────────────────────────────────────

describe('Opportunities — CRUD', () => {
  it('should create an opportunity', async () => {
    const res = await createOpportunity();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Test Opportunity');
    expect(res.body.data.stage).toBe('prospecting');
  });

  it('should get a single opportunity', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Test Opportunity');
  });

  it('should update an opportunity', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated Opportunity', value: 200000 });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Opportunity');
    expect(res.body.data.value).toBe(200000);
  });

  it('should delete an opportunity (admin)', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject delete by sales user', async () => {
    const createRes = await createOpportunity({ assignedTo: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(403);
  });
});

// ─── Search & Filter Tests ───────────────────────────────────────────────────

describe('Opportunities — Search & Filter', () => {
  beforeEach(async () => {
    await createOpportunity({ title: 'Website Project', value: 50000, stage: 'prospecting' });
    await createOpportunity({ title: 'Mobile App', value: 150000, stage: 'negotiation' });
    await createOpportunity({ title: 'Website Redesign', value: 75000, stage: 'proposal' });
  });

  it('should search opportunities by title', async () => {
    const res = await request(app)
      .get('/api/v1/opportunities?search=Website')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('should filter by stage', async () => {
    const res = await request(app)
      .get('/api/v1/opportunities?stage=negotiation')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].stage).toBe('negotiation');
  });

  it('should paginate', async () => {
    const res = await request(app)
      .get('/api/v1/opportunities?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(2);
  });
});

// ─── Stage Transition Tests ──────────────────────────────────────────────────

describe('Opportunities — Stage Transitions', () => {
  it('should transition prospecting → qualification', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'qualification' });

    expect(res.status).toBe(200);
    expect(res.body.data.opportunity.stage).toBe('qualification');
  });

  it('should reject invalid transition prospecting → won', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'won' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STAGE_TRANSITION');
  });

  it('should reject won → prospecting', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    // Move through stages to won
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'qualification' });
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'proposal' });
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'negotiation' });

    // Create and accept a quotation (required by Phase 4)
    const quoteRes = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ opportunity: id, items: [{ description: 'Work', quantity: 1, unitPrice: 100000, taxPercent: 18 }], validUntil: '2026-12-31T00:00:00.000Z' });
    const quoteId = quoteRes.body.data._id;
    await request(app).patch(`/api/v1/quotations/${quoteId}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/quotations/${quoteId}/accept`).set('Authorization', `Bearer ${adminToken}`);

    await request(app).patch(`/api/v1/opportunities/${id}/won`).set('Authorization', `Bearer ${adminToken}`).send({});

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'prospecting' });

    expect(res.status).toBe(400);
  });
});

// ─── Won/Lost Tests ──────────────────────────────────────────────────────────

describe('Opportunities — Won & Lost', () => {
  it('should mark as won from negotiation', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'qualification' });
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'proposal' });
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'negotiation' });

    // Create and accept a quotation (required by Phase 4)
    const quoteRes = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ opportunity: id, items: [{ description: 'Work', quantity: 1, unitPrice: 100000, taxPercent: 18 }], validUntil: '2026-12-31T00:00:00.000Z' });
    const quoteId = quoteRes.body.data._id;
    await request(app).patch(`/api/v1/quotations/${quoteId}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/quotations/${quoteId}/accept`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/won`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.opportunity.stage).toBe('won');
    expect(res.body.data.opportunity.wonAt).toBeDefined();
  });

  it('should reject winning from prospecting', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/won`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should mark as lost with reason', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'qualification' });
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'proposal' });

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/lost`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Budget constraints' });

    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe('lost');
    expect(res.body.data.lostReason).toBe('Budget constraints');
  });

  it('should reject lost without reason', async () => {
    const createRes = await createOpportunity();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'qualification' });
    await request(app).patch(`/api/v1/opportunities/${id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'proposal' });

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}/lost`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ─── Lead Conversion Tests ───────────────────────────────────────────────────

describe('Opportunities — Lead Conversion', () => {
  it('should convert a qualified lead to opportunity', async () => {
    const res = await request(app)
      .patch(`/api/v1/leads/${testLead._id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lead.status).toBe('converted');
    expect(res.body.data.opportunity).toBeDefined();
    expect(res.body.data.opportunity.lead.toString()).toBe(testLead._id);

    // Verify lead has the opportunity reference
    const leadRes = await request(app)
      .get(`/api/v1/leads/${testLead._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(leadRes.body.data.convertedToOpportunity).toBeDefined();
  });

  it('should reject converting an already-converted lead', async () => {
    await request(app).patch(`/api/v1/leads/${testLead._id}/convert`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/leads/${testLead._id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LEAD_ALREADY_CONVERTED');
  });
});

// ─── Ownership & Authorization Tests ─────────────────────────────────────────

describe('Opportunities — Ownership & Authorization', () => {
  it('should allow sales user to update own opportunity', async () => {
    const createRes = await createOpportunity({ assignedTo: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ title: 'Updated by owner' });

    expect(res.status).toBe(200);
  });

  it('should deny sales user updating another sales user opportunity', async () => {
    const createRes = await createOpportunity({ assignedTo: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${salesTokenB}`)
      .send({ title: 'Unauthorized' });

    expect(res.status).toBe(403);
  });

  it('should allow management to update any opportunity', async () => {
    const createRes = await createOpportunity({ assignedTo: salesUserA._id.toString() }, adminToken);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/opportunities/${id}`)
      .set('Authorization', `Bearer ${managementToken}`)
      .send({ title: 'Updated by management' });

    expect(res.status).toBe(200);
  });
});
