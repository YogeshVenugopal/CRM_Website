import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Opportunity from '../modules/pipeline/opportunity.model.js';

let adminRole, salesRole;
let adminUser, salesUserA, salesUserB;
let adminToken, salesTokenA, salesTokenB;
let testOpportunity;

beforeAll(async () => {
  await connect();
  await seedTestRoles();
  adminRole = await Role.findOne({ name: 'admin' });
  salesRole = await Role.findOne({ name: 'sales' });
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  await seedTestRoles();

  adminRole = await Role.findOne({ name: 'admin' });
  salesRole = await Role.findOne({ name: 'sales' });

  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: adminRole._id });
  salesUserA = await User.create({ name: 'Sales A', email: 'salesa@test.com', password: 'password123', role: salesRole._id });
  salesUserB = await User.create({ name: 'Sales B', email: 'salesb@test.com', password: 'password123', role: salesRole._id });

  adminToken = await loginAs('admin@test.com');
  salesTokenA = await loginAs('salesa@test.com');
  salesTokenB = await loginAs('salesb@test.com');

  // Create a test opportunity
  const oppRes = await request(app)
    .post('/api/v1/opportunities')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Test Opportunity', value: 100000, currency: 'INR', assignedTo: salesUserA._id.toString() });

  testOpportunity = oppRes.body.data;
});

async function loginAs(email) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

const validItems = [
  { description: 'Website Development', quantity: 1, unitPrice: 150000, taxPercent: 18 },
  { description: 'Maintenance', quantity: 12, unitPrice: 5000, taxPercent: 18 },
];

async function createQuotation(overrides = {}, token = adminToken) {
  return request(app)
    .post('/api/v1/quotations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      opportunity: testOpportunity._id,
      currency: 'INR',
      items: validItems,
      validUntil: '2026-12-31T00:00:00.000Z',
      ...overrides,
    });
}

// ─── Calculation Tests ───────────────────────────────────────────────────────

describe('Quotations — Calculations', () => {
  it('should calculate subtotal, tax, and total correctly', async () => {
    const res = await createQuotation();
    expect(res.status).toBe(201);

    // Item 1: 1 × 150000 = 150000, tax = 27000
    // Item 2: 12 × 5000 = 60000, tax = 10800
    // subtotal = 210000, tax = 37800, total = 247800
    expect(res.body.data.subtotal).toBe(210000);
    expect(res.body.data.tax).toBe(37800);
    expect(res.body.data.total).toBe(247800);
  });

  it('should reject empty items', async () => {
    const res = await createQuotation({ items: [] });
    expect(res.status).toBe(422);
  });

  it('should reject negative values', async () => {
    const res = await createQuotation({
      items: [{ description: 'Bad', quantity: -1, unitPrice: 100, taxPercent: 18 }],
    });
    expect(res.status).toBe(422);
  });
});

// ─── Numbering Tests ─────────────────────────────────────────────────────────

describe('Quotations — Numbering', () => {
  it('should generate unique quotation numbers', async () => {
    const res1 = await createQuotation();
    const res2 = await createQuotation();

    expect(res1.body.data.quotationNumber).toBeDefined();
    expect(res2.body.data.quotationNumber).toBeDefined();
    expect(res1.body.data.quotationNumber).not.toBe(res2.body.data.quotationNumber);
  });

  it('should follow QT-YYYY-NNNN format', async () => {
    const res = await createQuotation();
    const num = res.body.data.quotationNumber;
    expect(num).toMatch(/^QT-\d{4}-\d{4}$/);
  });
});

// ─── CRUD Tests ──────────────────────────────────────────────────────────────

describe('Quotations — CRUD', () => {
  it('should create a quotation', async () => {
    const res = await createQuotation();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.version).toBe(1);
  });

  it('should get a single quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.quotationNumber).toBeDefined();
  });

  it('should update a draft quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Updated notes' });

    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('Updated notes');
  });

  it('should recalculate totals when items change', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const newItems = [{ description: 'Simple', quantity: 1, unitPrice: 100000, taxPercent: 18 }];
    const res = await request(app)
      .patch(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: newItems });

    expect(res.status).toBe(200);
    expect(res.body.data.subtotal).toBe(100000);
    expect(res.body.data.tax).toBe(18000);
    expect(res.body.data.total).toBe(118000);
  });

  it('should delete a draft quotation (admin)', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── Status Transition Tests ─────────────────────────────────────────────────

describe('Quotations — Status Transitions', () => {
  it('should send a draft quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/quotations/${id}/send`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
    expect(res.body.data.sentAt).toBeDefined();
  });

  it('should accept a sent quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/quotations/${id}/send`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/quotations/${id}/accept`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
    expect(res.body.data.acceptedAt).toBeDefined();
  });

  it('should reject a sent quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/quotations/${id}/send`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/quotations/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Too expensive' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.rejectionReason).toBe('Too expensive');
  });

  it('should reject invalid transition draft → accepted', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/quotations/${id}/accept`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QUOTATION_TRANSITION');
  });

  it('should reject accepting a sent quotation without validUntil', async () => {
    const createRes = await createQuotation({ validUntil: null });
    const id = createRes.body.data._id;

    // Send will fail because validUntil is required
    const res = await request(app)
      .patch(`/api/v1/quotations/${id}/send`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── Immutability Tests ──────────────────────────────────────────────────────

describe('Quotations — Immutability', () => {
  it('should prevent editing an accepted quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/quotations/${id}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/quotations/${id}/accept`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Trying to edit' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUOTATION_IMMUTABLE');
  });

  it('should prevent deleting an accepted quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/quotations/${id}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/quotations/${id}/accept`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .delete(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── Versioning Tests ────────────────────────────────────────────────────────

describe('Quotations — Versioning', () => {
  it('should create a new version from a draft', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    const res = await request(app)
      .post(`/api/v1/quotations/${id}/version`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.version).toBe(2);
    expect(res.body.data.parentQuotation.toString()).toBe(id);
    expect(res.body.data.status).toBe('draft');
  });

  it('should not allow versioning from a sent quotation', async () => {
    const createRes = await createQuotation();
    const id = createRes.body.data._id;

    await request(app).patch(`/api/v1/quotations/${id}/send`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .post(`/api/v1/quotations/${id}/version`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── Ownership Tests ─────────────────────────────────────────────────────────

describe('Quotations — Ownership', () => {
  it('should allow sales user to access own quotation', async () => {
    const createRes = await createQuotation({}, salesTokenA);
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
  });

  it('should allow admin to access any quotation', async () => {
    const createRes = await createQuotation({}, salesTokenA);
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/quotations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── Opportunity Integration Tests ───────────────────────────────────────────

describe('Quotations — Opportunity Integration', () => {
  it('should list quotations for an opportunity', async () => {
    await createQuotation();
    await createQuotation();

    const res = await request(app)
      .get(`/api/v1/opportunities/${testOpportunity._id}/quotations`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('should require accepted quotation to mark opportunity as won', async () => {
    // Move opportunity to negotiation
    await request(app)
      .patch(`/api/v1/opportunities/${testOpportunity._id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'qualification' });
    await request(app)
      .patch(`/api/v1/opportunities/${testOpportunity._id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'proposal' });
    await request(app)
      .patch(`/api/v1/opportunities/${testOpportunity._id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'negotiation' });

    // Try to mark as won without accepted quotation
    const res = await request(app)
      .patch(`/api/v1/opportunities/${testOpportunity._id}/won`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_ACCEPTED_QUOTATION');
  });

  it('should mark opportunity as won with accepted quotation', async () => {
    // Create and accept a quotation
    const quoteRes = await createQuotation();
    const quoteId = quoteRes.body.data._id;

    await request(app).patch(`/api/v1/quotations/${quoteId}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/quotations/${quoteId}/accept`).set('Authorization', `Bearer ${adminToken}`);

    // Move opportunity to negotiation
    await request(app).patch(`/api/v1/opportunities/${testOpportunity._id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'qualification' });
    await request(app).patch(`/api/v1/opportunities/${testOpportunity._id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'proposal' });
    await request(app).patch(`/api/v1/opportunities/${testOpportunity._id}/stage`).set('Authorization', `Bearer ${adminToken}`).send({ stage: 'negotiation' });

    // Mark as won
    const res = await request(app)
      .patch(`/api/v1/opportunities/${testOpportunity._id}/won`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quotationId: quoteId });

    expect(res.status).toBe(200);
    expect(res.body.data.opportunity.stage).toBe('won');
    expect(res.body.data.acceptedQuotation).toBeDefined();
  });
});
