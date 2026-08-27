import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Lead from '../modules/leads/lead.model.js';
import Activity from '../modules/activities/activity.model.js';

let adminRole, salesRole;
let adminUser, salesUserA, salesUserB;
let adminToken, salesTokenA, salesTokenB;
let testLead;

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

  // Create a test lead assigned to salesUserA
  const leadRes = await request(app)
    .post('/api/v1/leads')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Lead', company: 'Test Corp', assignedTo: salesUserA._id.toString() });

  testLead = leadRes.body.data;
});

async function loginAs(email) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

// ─── CRUD Tests ──────────────────────────────────────────────────────────────

describe('Activities — CRUD', () => {
  it('should create a call activity', async () => {
    const res = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'call',
        relatedTo: { type: 'Lead', id: testLead._id },
        description: 'Called about project requirements',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('call');
    expect(res.body.data.owner).toBeDefined();
  });

  it('should create a follow-up with dueDate', async () => {
    const res = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'follow_up',
        relatedTo: { type: 'Lead', id: testLead._id },
        description: 'Follow up on proposal',
        dueDate: '2026-09-01T10:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('follow_up');
    expect(res.body.data.dueDate).toBeDefined();
    expect(res.body.data.completedAt).toBeNull();
  });

  it('should get a single activity', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: testLead._id }, description: 'Test note' });

    const activityId = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/activities/${activityId}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Test note');
  });

  it('should update an activity', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: testLead._id }, description: 'Original' });

    const activityId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/activities/${activityId}`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ description: 'Updated note' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated note');
  });

  it('should delete an activity', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: testLead._id }, description: 'To delete' });

    const activityId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/activities/${activityId}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
  });

  it('should reject invalid activity type', async () => {
    const res = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'invalid_type', relatedTo: { type: 'Lead', id: testLead._id } });

    expect(res.status).toBe(422);
  });

  it('should reject activity against non-existent resource', async () => {
    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: fakeId } });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RELATED_RESOURCE_NOT_FOUND');
  });
});

// ─── Timeline & Cursor Pagination ────────────────────────────────────────────

describe('Activities — Timeline & Cursor Pagination', () => {
  beforeEach(async () => {
    // Create multiple activities
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/activities')
        .set('Authorization', `Bearer ${salesTokenA}`)
        .send({
          type: i % 2 === 0 ? 'call' : 'email',
          relatedTo: { type: 'Lead', id: testLead._id },
          description: `Activity ${i}`,
        });
    }
  });

  it('should list activities for a lead', async () => {
    const res = await request(app)
      .get(`/api/v1/activities?relatedToType=Lead&relatedToId=${testLead._id}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    // Should be newest first
    expect(new Date(res.body.data[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(res.body.data[1].createdAt).getTime(),
    );
  });

  it('should use cursor pagination', async () => {
    const firstPage = await request(app)
      .get(`/api/v1/activities?relatedToType=Lead&relatedToId=${testLead._id}&limit=2`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(firstPage.body.data.length).toBe(2);
    expect(firstPage.body.meta.nextCursor).toBeDefined();

    // Get second page using cursor
    const secondPage = await request(app)
      .get(`/api/v1/activities?relatedToType=Lead&relatedToId=${testLead._id}&limit=2&before=${firstPage.body.meta.nextCursor}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(secondPage.body.data.length).toBe(2);
    // Should not overlap with first page
    const firstIds = firstPage.body.data.map((a) => a._id);
    const secondIds = secondPage.body.data.map((a) => a._id);
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });

  it('should filter by activity type', async () => {
    const res = await request(app)
      .get(`/api/v1/activities?relatedToType=Lead&relatedToId=${testLead._id}&type=call`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((a) => a.type === 'call')).toBe(true);
  });
});

// ─── Follow-Up Tests ─────────────────────────────────────────────────────────

describe('Activities — Follow-Ups', () => {
  it('should complete a follow-up', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'follow_up',
        relatedTo: { type: 'Lead', id: testLead._id },
        description: 'Follow up on proposal',
        dueDate: '2026-09-01T10:00:00.000Z',
      });

    const activityId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/activities/${activityId}/complete`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.completedAt).toBeDefined();
  });

  it('should reject completing a non-follow-up', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'call', relatedTo: { type: 'Lead', id: testLead._id }, description: 'A call' });

    const activityId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/activities/${activityId}/complete`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ACTIVITY_TYPE');
  });

  it('should reject completing an already-completed follow-up', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'follow_up',
        relatedTo: { type: 'Lead', id: testLead._id },
        dueDate: '2026-09-01T10:00:00.000Z',
      });

    const activityId = createRes.body.data._id;

    // Complete once
    await request(app)
      .patch(`/api/v1/activities/${activityId}/complete`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    // Try again
    const res = await request(app)
      .patch(`/api/v1/activities/${activityId}/complete`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FOLLOW_UP_ALREADY_COMPLETED');
  });

  it('should get pending follow-ups', async () => {
    // Create a pending follow-up
    await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'follow_up',
        relatedTo: { type: 'Lead', id: testLead._id },
        description: 'Pending follow-up',
        dueDate: '2026-09-01T10:00:00.000Z',
      });

    const res = await request(app)
      .get('/api/v1/activities/follow-ups')
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].completedAt).toBeNull();
  });
});

// ─── Access & Authorization Tests ────────────────────────────────────────────

describe('Activities — Access & Authorization', () => {
  it('should deny access to activities on leads the user cannot access', async () => {
    // Create activity on lead assigned to salesUserA
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: testLead._id }, description: 'My note' });

    const activityId = createRes.body.data._id;

    // salesUserB should not be able to read this activity
    const res = await request(app)
      .get(`/api/v1/activities/${activityId}`)
      .set('Authorization', `Bearer ${salesTokenB}`);

    expect(res.status).toBe(403);
  });

  it('should allow admin to access any activity', async () => {
    const createRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: testLead._id }, description: 'Admin can see' });

    const activityId = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should support lead-specific activities endpoint', async () => {
    await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ type: 'call', relatedTo: { type: 'Lead', id: testLead._id }, description: 'Lead call' });

    const res = await request(app)
      .get(`/api/v1/leads/${testLead._id}/activities`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('call');
  });
});
