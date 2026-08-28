import request from 'supertest';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import app from '../app.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Client from '../modules/clients/client.model.js';
import Lead from '../modules/leads/lead.model.js';
import Opportunity from '../modules/pipeline/opportunity.model.js';
import Quotation from '../modules/quotations/quotation.model.js';
import Project from '../modules/projects/project.model.js';
import Task from '../modules/tasks/task.model.js';
import Invoice from '../modules/finance/invoice.model.js';
import Payment from '../modules/finance/payment.model.js';
import Notification from '../modules/notifications/notification.model.js';

let adminToken, salesToken, pmToken, financeToken, empToken;
let adminUser, salesUser, pmUser, financeUser, empUser;

beforeAll(async () => {
  await connect();
  await seedTestRoles();

  const adminRole = await Role.findOne({ name: 'admin' });
  const salesRole = await Role.findOne({ name: 'sales' });
  const pmRole = await Role.findOne({ name: 'project_manager' });
  const financeRole = await Role.findOne({ name: 'finance' });
  const empRole = await Role.findOne({ name: 'employee' });

  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pass123', role: adminRole._id });
  salesUser = await User.create({ name: 'Sales', email: 'sales@test.com', password: 'pass123', role: salesRole._id });
  pmUser = await User.create({ name: 'PM', email: 'pm@test.com', password: 'pass123', role: pmRole._id });
  financeUser = await User.create({ name: 'Finance', email: 'finance@test.com', password: 'pass123', role: financeRole._id });
  empUser = await User.create({ name: 'Emp', email: 'emp@test.com', password: 'pass123', role: empRole._id });

  const login = async (email) => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'pass123' });
    return res.body.data?.accessToken;
  };

  adminToken = await login('admin@test.com');
  salesToken = await login('sales@test.com');
  pmToken = await login('pm@test.com');
  financeToken = await login('finance@test.com');
  empToken = await login('emp@test.com');
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

describe('Complete Business Workflow — Lead → Won → Project → Invoice → Payment', () => {
  let leadId, clientId, opportunityId, quotationId, projectId, invoiceId;

  test('1. Login as sales user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sales@test.com', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('2. Create a lead', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'Acme Corp',
        company: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+91-9876543210',
        source: 'website',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Acme Corp');
    expect(res.body.data.status).toBe('new');
    leadId = res.body.data._id;
  });

  test('3. Qualify the lead', async () => {
    // First contact
    await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'contacted' });

    // Qualify
    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/qualify`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lead.status).toBe('qualified');
  });

  test('4. Create client for the opportunity', async () => {
    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        companyName: 'Acme Corporation',
        primaryContact: { name: 'John Doe', email: 'john@acme.com', phone: '+91-9876543210' },
        billingAddress: '123 Business St, Mumbai',
      });

    expect(res.status).toBe(201);
    clientId = res.body.data._id;
  });

  test('5. Convert lead to opportunity', async () => {
    const res = await request(app)
      .patch(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lead.status).toBe('converted');
    opportunityId = res.body.data.opportunity._id;
    expect(opportunityId).toBeDefined();
  });

  test('6. Update opportunity value and move through stages', async () => {
    // Update value
    await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ value: 500000, expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });

    // Move to qualification
    await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}/stage`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ stage: 'qualification' });

    // Move to proposal
    await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}/stage`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ stage: 'proposal' });

    // Move to negotiation
    const res = await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}/stage`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ stage: 'negotiation' });

    expect(res.status).toBe(200);
  });

  test('7. Create quotation', async () => {
    const res = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        opportunity: opportunityId,
        client: clientId,
        currency: 'INR',
        items: [
          { description: 'Website Development', quantity: 1, unitPrice: 300000, taxPercent: 18 },
          { description: 'SEO Services', quantity: 6, unitPrice: 15000, taxPercent: 18 },
        ],
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Payment: 50% upfront, 50% on delivery',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(390000);
    expect(res.body.data.tax).toBe(70200);
    expect(res.body.data.total).toBe(460200);
    expect(res.body.data.status).toBe('draft');
    quotationId = res.body.data._id;
  });

  test('8. Send quotation', async () => {
    const res = await request(app)
      .patch(`/api/v1/quotations/${quotationId}/send`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
    expect(res.body.data.sentAt).toBeDefined();
  });

  test('9. Accept quotation', async () => {
    const res = await request(app)
      .patch(`/api/v1/quotations/${quotationId}/accept`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
    expect(res.body.data.acceptedAt).toBeDefined();
  });

  test('10. Mark opportunity as won — creates project + draft invoice', async () => {
    const res = await request(app)
      .patch(`/api/v1/opportunities/${opportunityId}/won`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ quotationId });

    expect(res.status).toBe(200);
    expect(res.body.data.opportunity.stage).toBe('won');
    expect(res.body.data.project).toBeDefined();
    expect(res.body.data.draftInvoice).toBeDefined();

    projectId = res.body.data.project._id;
    invoiceId = res.body.data.draftInvoice._id;

    // Verify project has correct references
    expect(res.body.data.project.client.toString()).toBe(clientId.toString());
    expect(res.body.data.project.sourceOpportunity.toString()).toBe(opportunityId.toString());
    expect(res.body.data.project.sourceQuotation.toString()).toBe(quotationId.toString());
  });

  test('11. Assign project manager', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/manager`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ manager: pmUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.manager).toBe(pmUser._id.toString());
  });

  test('12. Add team to project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/team`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ team: [empUser._id.toString()] });

    expect(res.status).toBe(200);
  });

  test('13. Start project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/status`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.project.status).toBe('in_progress');
  });

  test('14. Create task', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/project/${projectId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Setup development environment',
        assignee: empUser._id.toString(),
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('todo');
  });

  test('15. Employee starts task', async () => {
    const tasks = await Task.find({ project: projectId });
    const taskId = tasks[0]._id;

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('in_progress');
  });

  test('16. Employee completes task', async () => {
    const tasks = await Task.find({ project: projectId });
    const taskId = tasks[0]._id;

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('done');
    expect(res.body.data.task.completedAt).toBeDefined();
  });

  test('17. Finance sends invoice', async () => {
    const res = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
  });

  test('18. Record payment', async () => {
    const invoice = await Invoice.findById(invoiceId);

    const res = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: invoice.amountDue,
        method: 'bank_transfer',
        transactionRef: 'NEFT-2026-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.status).toBe('paid');
    expect(res.body.data.invoice.balance).toBe(0);
    expect(res.body.data.invoice.paidAt).toBeDefined();
    expect(res.body.data.payment.amount).toBe(invoice.amountDue);
  });

  test('19. Verify invoice is fully paid', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.body.data.status).toBe('paid');
    expect(res.body.data.amountPaid).toBe(res.body.data.amountDue);
    expect(res.body.data.balance).toBe(0);
  });

  test('20. Verify lead is converted', async () => {
    const lead = await Lead.findById(leadId);
    expect(lead.status).toBe('converted');
    expect(lead.convertedToOpportunity.toString()).toBe(opportunityId.toString());
  });

  test('21. Verify opportunity is won', async () => {
    const opp = await Opportunity.findById(opportunityId);
    expect(opp.stage).toBe('won');
    expect(opp.wonAt).toBeDefined();
  });

  test('22. Verify project exists with correct links', async () => {
    const project = await Project.findById(projectId);
    expect(project.client.toString()).toBe(clientId.toString());
    expect(project.sourceOpportunity.toString()).toBe(opportunityId.toString());
    expect(project.sourceQuotation.toString()).toBe(quotationId.toString());
  });

  test('23. Verify invoice has full traceability', async () => {
    const invoice = await Invoice.findById(invoiceId);
    expect(invoice.client.toString()).toBe(clientId.toString());
    expect(invoice.project.toString()).toBe(projectId.toString());
    expect(invoice.opportunity.toString()).toBe(opportunityId.toString());
    expect(invoice.quotation.toString()).toBe(quotationId.toString());
  });

  test('24. Unauthorized user cannot access sales pipeline', async () => {
    const res = await request(app)
      .get('/api/v1/reports/sales-pipeline')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.status).toBe(403);
  });

  test('25. Admin can access reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/sales-pipeline')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.overall).toBeDefined();
  });

  test('26. Finance can access finance report', async () => {
    const res = await request(app)
      .get('/api/v1/reports/finance-overview')
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.overall.totalInvoiced).toBeGreaterThan(0);
  });
});

describe('Failure Scenarios', () => {
  test('Cannot convert an already-converted lead', async () => {
    // Create a lead in qualified state
    const lead = await Lead.create({
      name: 'Dup Lead',
      company: 'Dup Corp',
      source: 'other',
      status: 'qualified',
      assignedTo: salesUser._id,
      createdBy: salesUser._id,
    });

    // Convert it
    await request(app)
      .patch(`/api/v1/leads/${lead._id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    // Try to convert again
    const res = await request(app)
      .patch(`/api/v1/leads/${lead._id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LEAD_ALREADY_CONVERTED');
  });

  test('Cannot mark opportunity won without accepted quotation', async () => {
    const opp = await Opportunity.create({
      title: 'No Quote Opp',
      value: 100000,
      stage: 'negotiation',
      assignedTo: salesUser._id,
      createdBy: salesUser._id,
    });

    const res = await request(app)
      .patch(`/api/v1/opportunities/${opp._id}/won`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_ACCEPTED_QUOTATION');
  });

  test('Payment exceeding balance is rejected', async () => {
    const client = await Client.create({
      companyName: 'Fail Client',
      primaryContact: { name: 'Fail', email: 'fail@test.com' },
      createdBy: adminUser._id,
    });

    const invoice = await Invoice.create({
      invoiceNumber: 'INV-TEST-0001',
      client: client._id,
      items: [{ description: 'Test', quantity: 1, unitPrice: 10000, taxPercent: 18 }],
      subtotal: 10000,
      tax: 1800,
      amountDue: 11800,
      amountPaid: 0,
      balance: 11800,
      status: 'sent',
      createdBy: adminUser._id,
    });

    const res = await request(app)
      .post(`/api/v1/invoices/${invoice._id}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ amount: 50000, method: 'cash' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_EXCEEDS_BALANCE');
  });
});
