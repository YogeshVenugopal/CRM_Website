import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Lead from '../modules/leads/lead.model.js';
import Opportunity from '../modules/pipeline/opportunity.model.js';

let adminRole, salesRole;
let adminUser, salesUserA;
let adminToken, salesTokenA;

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

  adminToken = await loginAs('admin@test.com');
  salesTokenA = await loginAs('salesa@test.com');
});

async function loginAs(email) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
  return res.body.data?.accessToken;
}

describe('Phase 3 Integration — Full Pipeline Flow', () => {
  it('should complete: Lead → Qualified → Converted → Opportunity → Won → Client', async () => {
    // Step 1: Create a lead
    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Corp', company: 'Acme Inc', email: 'contact@acme.com', source: 'website', assignedTo: salesUserA._id.toString() });

    const leadId = leadRes.body.data._id;
    expect(leadRes.body.data.status).toBe('new');

    // Step 2: Contact and qualify
    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${salesTokenA}`).send({ status: 'contacted' });
    await request(app).patch(`/api/v1/leads/${leadId}/qualify`).set('Authorization', `Bearer ${salesTokenA}`);

    // Step 3: Convert lead to opportunity
    const convertRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(convertRes.status).toBe(200);
    const opportunityId = convertRes.body.data.opportunity._id;

    // Step 4: Verify opportunity exists
    const oppRes = await request(app)
      .get(`/api/v1/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(oppRes.status).toBe(200);
    expect(oppRes.body.data.stage).toBe('prospecting');
    expect(oppRes.body.data.lead._id).toBe(leadId);

    // Step 5: Move through stages
    await request(app).patch(`/api/v1/opportunities/${opportunityId}/stage`).set('Authorization', `Bearer ${salesTokenA}`).send({ stage: 'qualification' });
    await request(app).patch(`/api/v1/opportunities/${opportunityId}/stage`).set('Authorization', `Bearer ${salesTokenA}`).send({ stage: 'proposal' });
    await request(app).patch(`/api/v1/opportunities/${opportunityId}/stage`).set('Authorization', `Bearer ${salesTokenA}`).send({ stage: 'negotiation' });

    // Step 6: Create a client
    const clientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({
        companyName: 'Acme Corporation',
        primaryContact: { name: 'John Doe', email: 'john@acme.com' },
        accountOwner: salesUserA._id.toString(),
      });

    const clientId = clientRes.body.data._id;
    expect(clientRes.status).toBe(201);

    // Step 7: Link client to opportunity
    await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({ client: clientId });

    // Step 8: Mark opportunity as won
    const wonRes = await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}/won`)
      .set('Authorization', `Bearer ${salesTokenA}`)
      .send({});

    expect(wonRes.status).toBe(200);
    expect(wonRes.body.data.opportunity.stage).toBe('won');
    expect(wonRes.body.data.opportunity.wonAt).toBeDefined();

    // Step 9: Verify client 360 shows the won opportunity
    const client360Res = await request(app)
      .get(`/api/v1/clients/${clientId}/360`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(client360Res.status).toBe(200);
    expect(client360Res.body.data.opportunities.length).toBe(1);
    expect(client360Res.body.data.stats.wonOpportunities).toBe(1);
  });

  it('should verify Lead ↔ Opportunity referential integrity', async () => {
    // Create and convert a lead
    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Integrity Lead', company: 'Integrity Corp' });

    const leadId = leadRes.body.data._id;

    await request(app).patch(`/api/v1/leads/${leadId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'contacted' });
    await request(app).patch(`/api/v1/leads/${leadId}/qualify`).set('Authorization', `Bearer ${adminToken}`);

    const convertRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    const opportunityId = convertRes.body.data.opportunity._id;

    // Verify: lead has convertedToOpportunity
    const lead = await Lead.findById(leadId);
    expect(lead.status).toBe('converted');
    expect(lead.convertedToOpportunity.toString()).toBe(opportunityId);

    // Verify: opportunity has lead reference
    const opportunity = await Opportunity.findById(opportunityId);
    expect(opportunity.lead.toString()).toBe(leadId);
  });

  it('should handle Opportunity activities through polymorphic system', async () => {
    // Create opportunity
    const oppRes = await request(app)
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Activity Test Opp', value: 50000 });

    const oppId = oppRes.body.data._id;

    // Create activity on opportunity
    const actRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'call', relatedTo: { type: 'Opportunity', id: oppId }, description: 'Discussed terms' });

    expect(actRes.status).toBe(201);

    // Get timeline for opportunity
    const timelineRes = await request(app)
      .get(`/api/v1/activities?relatedToType=Opportunity&relatedToId=${oppId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.data.length).toBe(1);
    expect(timelineRes.body.data[0].type).toBe('call');
  });

  it('should handle Client activities through polymorphic system', async () => {
    // Create client
    const clientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Activity Client', primaryContact: { name: 'Jane', email: 'jane@client.com' } });

    const clientId = clientRes.body.data._id;

    // Create activity on client
    const actRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'meeting', relatedTo: { type: 'Client', id: clientId }, description: 'Quarterly review' });

    expect(actRes.status).toBe(201);

    // Get timeline for client
    const timelineRes = await request(app)
      .get(`/api/v1/activities?relatedToType=Client&relatedToId=${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.data.length).toBe(1);
    expect(timelineRes.body.data[0].type).toBe('meeting');
  });

  it('should deny unauthorized access across modules', async () => {
    // Create opportunity assigned to salesUserA
    const oppRes = await request(app)
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Private Opp', value: 100000, assignedTo: salesUserA._id.toString() });

    const oppId = oppRes.body.data._id;

    // salesUserA should be able to access
    const accessRes = await request(app)
      .get(`/api/v1/opportunities/${oppId}`)
      .set('Authorization', `Bearer ${salesTokenA}`);

    expect(accessRes.status).toBe(200);

    // Create a different sales user without access
    const salesRole = await Role.findOne({ name: 'sales' });
    const salesUserC = await User.create({ name: 'Sales C', email: 'salesc@test.com', password: 'password123', role: salesRole._id });
    const salesTokenC = await loginAs('salesc@test.com');

    // salesUserC should NOT be able to update the opportunity
    const updateRes = await request(app)
      .patch(`/api/v1/opportunities/${oppId}`)
      .set('Authorization', `Bearer ${salesTokenC}`)
      .send({ title: 'Hacked' });

    expect(updateRes.status).toBe(403);
  });
});
