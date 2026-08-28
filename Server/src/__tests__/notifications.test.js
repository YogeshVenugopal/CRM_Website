import request from 'supertest';
import mongoose from 'mongoose';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import app from '../app.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Notification from '../modules/notifications/notification.model.js';

let adminToken, employeeToken;
let adminUser, employeeUser;

beforeAll(async () => {
  await connect();
  await seedTestRoles();

  const adminRole = await Role.findOne({ name: 'admin' });
  const empRole = await Role.findOne({ name: 'employee' });

  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pass123', role: adminRole._id });
  employeeUser = await User.create({ name: 'Emp', email: 'emp@test.com', password: 'pass123', role: empRole._id });

  const login = async (email) => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'pass123' });
    return res.body.data?.accessToken;
  };

  adminToken = await login('admin@test.com');
  employeeToken = await login('emp@test.com');

  // Create test notifications
  await Notification.create([
    {
      recipient: employeeUser._id,
      type: 'task_assigned',
      title: 'New task assigned',
      message: 'You have a new task',
      resourceType: 'Task',
    },
    {
      recipient: employeeUser._id,
      type: 'follow_up_due',
      title: 'Follow-up due',
      message: 'Follow-up is due today',
      isRead: true,
      readAt: new Date(),
    },
    {
      recipient: adminUser._id,
      type: 'invoice_overdue',
      title: 'Invoice overdue',
      message: 'An invoice is overdue',
    },
  ]);
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

describe('Notification Module', () => {
  test('Get notifications for a user', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // Employee has 2 notifications
  });

  test('Get unread count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
  });

  test('Admin does not see employee notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // Admin has 1 notification
  });

  test('Mark notification as read', async () => {
    const employeeNotifications = await Notification.find({ recipient: employeeUser._id, isRead: false });
    const notifId = employeeNotifications[0]._id;

    const res = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
    expect(res.body.data.readAt).toBeDefined();
  });

  test('Unread count is now 0', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
  });

  test('Mark all as read', async () => {
    // Create some unread notifications first
    await Notification.create([
      { recipient: employeeUser._id, type: 'general', title: 'Test 1', message: 'msg1' },
      { recipient: employeeUser._id, type: 'general', title: 'Test 2', message: 'msg2' },
    ]);

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.modifiedCount).toBeGreaterThanOrEqual(2);

    // Verify all are read now
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(countRes.body.data.count).toBe(0);
  });

  test('Unauthenticated user cannot access notifications', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  test('Cannot mark another user notification as read', async () => {
    const adminNotif = await Notification.findOne({ recipient: adminUser._id });
    if (adminNotif) {
      const res = await request(app)
        .patch(`/api/v1/notifications/${adminNotif._id}/read`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(404); // findOneAndUpdate returns null if recipient doesn't match
    }
  });
});
