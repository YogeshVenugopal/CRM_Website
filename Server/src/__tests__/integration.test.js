import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';

let adminRole, salesRole;
let adminUser, salesUserA, salesUserB;

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
});

async function loginAs(email) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

describe('Integration — Full Lead Lifecycle', () => {
  it('should complete: login → create lead → assign → create activity → follow-up → qualify', async () => {
    // Step 1: Login as admin
    const adminToken = await loginAs('admin@test.com');
    expect(adminToken).toBeDefined();

    // Step 2: Create a lead
    const createLeadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Acme Corporation',
        company: 'Acme Inc',
        email: 'contact@acme.com',
        phone: '+1234567890',
        source: 'website',
      });

    expect(createLeadRes.status).toBe(201);
    const leadId = createLeadRes.body.data._id;
    expect(createLeadRes.body.data.status).toBe('new');

    // Step 3: Assign lead to sales user
    const salesTokenA = await loginAs('salesa@test.com');
    const assignRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: salesUserA._id.toString() });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.lead.assignedTo).toBe(salesUserA._id.toString());

    // Step 4: Sales user creates a call activity
    const callRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'call',
        relatedTo: { type: 'Lead', id: leadId },
        description: 'Initial call — discussed requirements',
      });

    expect(callRes.status).toBe(201);

    // Step 5: Create a follow-up
    const followUpRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        type: 'follow_up',
        relatedTo: { type: 'Lead', id: leadId },
        description: 'Send proposal',
        dueDate: '2026-09-01T10:00:00.000Z',
      });

    expect(followUpRes.status).toBe(201);
    const followUpId = followUpRes.body.data._id;

    // Step 6: Transition lead to contacted
    const statusRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ status: 'contacted' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.lead.status).toBe('contacted');

    // Step 7: Complete the follow-up
    const completeRes = await request(app)
      .patch(`/api/v1/activities/${followUpId}/complete`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.completedAt).toBeDefined();

    // Step 8: Qualify the lead
    const qualifyRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/qualify`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(qualifyRes.status).toBe(200);
    expect(qualifyRes.body.data.lead.status).toBe('qualified');

    // Step 9: Verify lead details show qualified status
    const getLeadRes = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(getLeadRes.status).toBe(200);
    expect(getLeadRes.body.data.status).toBe('qualified');

    // Step 10: Verify activities timeline
    const timelineRes = await request(app)
      .get(`/api/v1/leads/${leadId}/activities`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.data.length).toBe(2); // call + follow_up
  });

  it('should prevent unauthorized user from accessing another users lead', async () => {
    const adminToken = await loginAs('admin@test.com');
    const salesTokenB = await loginAs('salesb@test.com');

    // Admin creates lead assigned to salesUserA
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Private Lead', assignedTo: salesUserA._id.toString() });

    const leadId = createRes.body.data._id;

    // salesUserB tries to update the lead
    const updateRes = await request(app)
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${salesTokenB}`)
      .send({ name: 'Hacked Lead' });

    expect(updateRes.status).toBe(403);

    // salesUserB tries to create activity on the lead
    const activityRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${salesTokenB}`)
      .send({ type: 'note', relatedTo: { type: 'Lead', id: leadId }, description: 'Snooping' });

    expect(activityRes.status).toBe(403);
  });

  it('should verify passwords are not leaked in any response', async () => {
    const adminToken = await loginAs('admin@test.com');

    // Get user list
    const usersRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    for (const user of usersRes.body.data) {
      expect(user.passwordHash).toBeUndefined();
      expect(user.refreshTokenHash).toBeUndefined();
    }
  });
});
