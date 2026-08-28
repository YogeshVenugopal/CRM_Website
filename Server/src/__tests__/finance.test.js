import request from 'supertest';
import mongoose from 'mongoose';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import app from '../app.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Client from '../modules/clients/client.model.js';
import Project from '../modules/projects/project.model.js';
import Invoice from '../modules/finance/invoice.model.js';
import Payment from '../modules/finance/payment.model.js';

let adminToken, financeToken, salesToken, pmToken;
let adminUser, financeUser, salesUser, pmUser;
let client, project;

beforeAll(async () => {
  await connect();
  await seedTestRoles();

  const adminRole = await Role.findOne({ name: 'admin' });
  const financeRole = await Role.findOne({ name: 'finance' });
  const salesRole = await Role.findOne({ name: 'sales' });
  const pmRole = await Role.findOne({ name: 'project_manager' });

  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pass123', role: adminRole._id });
  financeUser = await User.create({ name: 'Finance', email: 'finance@test.com', password: 'pass123', role: financeRole._id });
  salesUser = await User.create({ name: 'Sales', email: 'sales@test.com', password: 'pass123', role: salesRole._id });
  pmUser = await User.create({ name: 'PM', email: 'pm@test.com', password: 'pass123', role: pmRole._id });

  const login = async (email) => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'pass123' });
    return res.body.data?.accessToken;
  };

  adminToken = await login('admin@test.com');
  financeToken = await login('finance@test.com');
  salesToken = await login('sales@test.com');
  pmToken = await login('pm@test.com');

  client = await Client.create({
    companyName: 'Finance Test Corp',
    primaryContact: { name: 'Jane', email: 'jane@test.com' },
    createdBy: adminUser._id,
  });

  project = await Project.create({
    name: 'Finance Test Project',
    client: client._id,
    manager: pmUser._id,
    createdBy: adminUser._id,
  });
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

describe('Invoice Module', () => {
  let invoiceId;

  test('Admin can create an invoice', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client: client._id.toString(),
        project: project._id.toString(),
        items: [
          { description: 'Development', quantity: 1, unitPrice: 100000, taxPercent: 18 },
          { description: 'Design', quantity: 1, unitPrice: 50000, taxPercent: 18 },
        ],
        currency: 'INR',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toMatch(/^INV-/);
    expect(res.body.data.subtotal).toBe(150000);
    expect(res.body.data.tax).toBe(27000);
    expect(res.body.data.amountDue).toBe(177000);
    expect(res.body.data.balance).toBe(177000);
    expect(res.body.data.status).toBe('draft');
    invoiceId = res.body.data._id;
  });

  test('Get invoices list', async () => {
    const res = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('Get invoice by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(invoiceId);
  });

  test('Finance can send invoice', async () => {
    const res = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}/send`)
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
    expect(res.body.data.issuedAt).toBeDefined();
  });

  test('Cannot modify a sent invoice', async () => {
    const res = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ notes: 'Should fail' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVOICE_IMMUTABLE');
  });

  test('Cannot record payment exceeding balance', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: 999999,
        method: 'bank_transfer',
        transactionRef: 'TXN-001',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_EXCEEDS_BALANCE');
  });

  test('Record a partial payment', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: 50000,
        method: 'bank_transfer',
        transactionRef: 'TXN-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.amount).toBe(50000);
    expect(res.body.data.invoice.amountPaid).toBe(50000);
    expect(res.body.data.invoice.balance).toBe(127000);
    expect(res.body.data.invoice.status).toBe('partially_paid');
  });

  test('Record full remaining payment', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: 127000,
        method: 'card',
        transactionRef: 'TXN-002',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.status).toBe('paid');
    expect(res.body.data.invoice.balance).toBe(0);
    expect(res.body.data.invoice.paidAt).toBeDefined();
  });

  test('Cannot pay a paid invoice', async () => {
    const res = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: 1000,
        method: 'cash',
      });

    expect(res.status).toBe(400);
  });

  test('Sales cannot create invoice', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        client: client._id.toString(),
        items: [{ description: 'Test', quantity: 1, unitPrice: 1000, taxPercent: 18 }],
      });

    expect(res.status).toBe(403);
  });

  test('Finance can cancel a draft invoice', async () => {
    // Create a new draft invoice
    const createRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client: client._id.toString(),
        items: [{ description: 'To Cancel', quantity: 1, unitPrice: 10000, taxPercent: 18 }],
      });

    const newInvoiceId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/invoices/${newInvoiceId}/cancel`)
      .set('Authorization', `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('Cannot record payment on cancelled invoice', async () => {
    const createRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client: client._id.toString(),
        items: [{ description: 'Cancelled', quantity: 1, unitPrice: 5000, taxPercent: 18 }],
      });

    const invId = createRes.body.data._id;

    // Cancel it
    await request(app)
      .patch(`/api/v1/invoices/${invId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Try to pay
    const res = await request(app)
      .post(`/api/v1/invoices/${invId}/payments`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ amount: 5000, method: 'cash' });

    expect(res.status).toBe(400);
  });
});

describe('Payment Model', () => {
  test('Payment methods are valid', () => {
    expect(Payment.PAYMENT_METHODS).toContain('bank_transfer');
    expect(Payment.PAYMENT_METHODS).toContain('cash');
    expect(Payment.PAYMENT_METHODS).toContain('card');
    expect(Payment.PAYMENT_METHODS).toContain('upi');
    expect(Payment.PAYMENT_METHODS).toContain('other');
  });
});

describe('Invoice Calculations', () => {
  test('Server calculates totals correctly', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client: client._id.toString(),
        items: [
          { description: 'Item A', quantity: 2, unitPrice: 10000, taxPercent: 18 },
          { description: 'Item B', quantity: 1, unitPrice: 5000, taxPercent: 10 },
        ],
      });

    // Item A: 2 * 10000 = 20000, tax = 3600
    // Item B: 1 * 5000 = 5000, tax = 500
    // subtotal = 25000, tax = 4100, total = 29100
    expect(res.body.data.subtotal).toBe(25000);
    expect(res.body.data.tax).toBe(4100);
    expect(res.body.data.amountDue).toBe(29100);
  });
});
