import request from 'supertest';
import mongoose from 'mongoose';
import { connect, closeDatabase, clearDatabase, seedTestRoles } from './setup.js';
import app from '../app.js';
import User from '../modules/users/user.model.js';
import Role from '../modules/users/role.model.js';
import Client from '../modules/clients/client.model.js';
import Project from '../modules/projects/project.model.js';
import Task from '../modules/tasks/task.model.js';

let adminToken, pmToken, employeeToken, salesToken;
let adminUser, pmUser, employeeUser, salesUser;
let client;

beforeAll(async () => {
  await connect();
  await seedTestRoles();

  // Create users
  const adminRole = await Role.findOne({ name: 'admin' });
  const pmRole = await Role.findOne({ name: 'project_manager' });
  const empRole = await Role.findOne({ name: 'employee' });
  const salesRole = await Role.findOne({ name: 'sales' });

  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pass123', role: adminRole._id });
  pmUser = await User.create({ name: 'PM', email: 'pm@test.com', password: 'pass123', role: pmRole._id });
  employeeUser = await User.create({ name: 'Emp', email: 'emp@test.com', password: 'pass123', role: empRole._id });
  salesUser = await User.create({ name: 'Sales', email: 'sales@test.com', password: 'pass123', role: salesRole._id });

  // Login all users
  const login = async (email) => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'pass123' });
    return res.body.data?.accessToken;
  };

  adminToken = await login('admin@test.com');
  pmToken = await login('pm@test.com');
  employeeToken = await login('emp@test.com');
  salesToken = await login('sales@test.com');

  // Create a client
  client = await Client.create({
    companyName: 'Test Corp',
    primaryContact: { name: 'John', email: 'john@test.com' },
    createdBy: adminUser._id,
  });
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

describe('Projects Module', () => {
  let projectId;

  test('Admin can create a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Project',
        client: client._id.toString(),
        budget: 500000,
        manager: pmUser._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Project');
    expect(res.body.data.status).toBe('planned');
    projectId = res.body.data._id;
  });

  test('Get projects list', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  test('Get project by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(projectId);
  });

  test('Update a project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Updated Project', budget: 600000 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Project');
    expect(res.body.data.budget).toBe(600000);
  });

  test('PM can change project status', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/status`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.project.status).toBe('in_progress');
  });

  test('Invalid status transition fails', async () => {
    // completed → planned is not allowed
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/status`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ status: 'planned' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_STATUS_TRANSITION');
  });

  test('PM can assign manager', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/manager`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ manager: pmUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.manager).toBe(pmUser._id.toString());
  });

  test('PM can assign team', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/team`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ team: [employeeUser._id.toString()] });

    expect(res.status).toBe(200);
    expect(res.body.data.team).toContainEqual(employeeUser._id.toString());
  });

  test('Employee cannot create a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Should Fail', client: client._id.toString() });

    expect(res.status).toBe(403);
  });

  test('Unauthenticated user cannot access projects', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });
});

describe('Tasks Module', () => {
  let projectId, taskId;

  beforeAll(async () => {
    // Create a project for tasks
    const project = await Project.create({
      name: 'Task Test Project',
      client: client._id,
      manager: pmUser._id,
      status: 'in_progress',
      createdBy: adminUser._id,
    });
    projectId = project._id;
  });

  test('PM can create a task', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/project/${projectId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Test Task',
        assignee: employeeUser._id.toString(),
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Test Task');
    expect(res.body.data.status).toBe('todo');
    taskId = res.body.data._id;
  });

  test('Get tasks for a project', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/project/${projectId}`)
      .set('Authorization', `Bearer ${pmToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('Change task status to in_progress', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('in_progress');
  });

  test('Complete a task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('done');
    expect(res.body.data.task.completedAt).toBeDefined();
  });

  test('Invalid task status transition fails', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: 'todo' }); // Can't go back from done

    expect(res.status).toBe(400);
  });

  test('PM can assign a task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/assign`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ assignee: adminUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.assignee).toBe(adminUser._id.toString());
  });

  test('Cannot assign to inactive user', async () => {
    const inactiveUser = await User.create({
      name: 'Inactive',
      email: 'inactive@test.com',
      password: 'pass123',
      role: (await Role.findOne({ name: 'employee' }))._id,
      isActive: false,
    });

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/assign`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ assignee: inactiveUser._id.toString() });

    expect(res.status).toBe(400);
  });
});
