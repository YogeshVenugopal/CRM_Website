import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Role from '../modules/users/role.model.js';

let mongoServer;

/**
 * Connect to in-memory MongoDB
 */
export const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  return uri;
};

/**
 * Drop DB, stop server
 */
export const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Remove all data from collections
 */
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Seed default roles for tests
 */
export const seedTestRoles = async () => {
  const roles = [
    {
      name: 'admin',
      isSystemRole: true,
      permissions: [
        'user:create', 'user:read', 'user:update', 'user:delete',
        'role:read',
        'lead:create', 'lead:read', 'lead:update', 'lead:delete',
        'opportunity:create', 'opportunity:read', 'opportunity:update', 'opportunity:delete',
        'client:create', 'client:read', 'client:update', 'client:delete',
        'project:create', 'project:read', 'project:update', 'project:delete',
        'task:create', 'task:read', 'task:update', 'task:delete',
        'invoice:create', 'invoice:read', 'invoice:update', 'invoice:send', 'invoice:approve', 'invoice:cancel',
        'payment:create', 'payment:read', 'payment:update',
        'quotation:create', 'quotation:read', 'quotation:update', 'quotation:delete', 'quotation:send', 'quotation:accept', 'quotation:reject', 'quotation:version',
        'activity:create', 'activity:read', 'activity:update', 'activity:delete',
        'notification:create', 'notification:read', 'notification:update', 'notification:delete',
        'report:read', 'report:export',
      ],
    },
    {
      name: 'management',
      isSystemRole: true,
      permissions: [
        'user:read',
        'lead:create', 'lead:read', 'lead:update', 'lead:delete',
        'opportunity:create', 'opportunity:read', 'opportunity:update', 'opportunity:delete',
        'client:create', 'client:read', 'client:update', 'client:delete',
        'project:create', 'project:read', 'project:update', 'project:delete',
        'task:create', 'task:read', 'task:update', 'task:delete',
        'invoice:create', 'invoice:read', 'invoice:update', 'invoice:send', 'invoice:approve', 'invoice:cancel',
        'payment:create', 'payment:read', 'payment:update',
        'quotation:create', 'quotation:read', 'quotation:update', 'quotation:delete', 'quotation:send', 'quotation:accept', 'quotation:reject', 'quotation:version',
        'activity:create', 'activity:read', 'activity:update', 'activity:delete',
        'notification:create', 'notification:read', 'notification:update', 'notification:delete',
        'report:read', 'report:export',
      ],
    },
    {
      name: 'sales',
      isSystemRole: true,
      permissions: [
        'lead:create', 'lead:read', 'lead:update',
        'opportunity:create', 'opportunity:read', 'opportunity:update',
        'client:create', 'client:read', 'client:update',
        'quotation:create', 'quotation:read', 'quotation:update', 'quotation:send', 'quotation:accept', 'quotation:reject',
        'activity:create', 'activity:read', 'activity:update',
        'notification:read',
        'project:read',
      ],
    },
    {
      name: 'project_manager',
      isSystemRole: true,
      permissions: [
        'project:create', 'project:read', 'project:update', 'project:delete',
        'task:create', 'task:read', 'task:update', 'task:delete',
        'client:read', 'client:update',
        'activity:create', 'activity:read', 'activity:update', 'activity:delete',
        'notification:read',
        'quotation:read',
        'report:read',
      ],
    },
    {
      name: 'employee',
      isSystemRole: true,
      permissions: [
        'task:read', 'task:update',
        'activity:create', 'activity:read', 'activity:update',
        'notification:read',
        'project:read',
      ],
    },
    {
      name: 'finance',
      isSystemRole: true,
      permissions: [
        'client:read',
        'project:read',
        'invoice:create', 'invoice:read', 'invoice:update', 'invoice:send', 'invoice:approve', 'invoice:cancel',
        'payment:create', 'payment:read', 'payment:update',
        'quotation:read',
        'activity:read',
        'notification:read',
        'report:read', 'report:export',
      ],
    },
  ];

  for (const roleData of roles) {
    await Role.findOneAndUpdate({ name: roleData.name }, roleData, { upsert: true, new: true });
  }
};
