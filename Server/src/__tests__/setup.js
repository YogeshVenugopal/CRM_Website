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
    { name: 'admin', isSystemRole: true, permissions: ['user:create', 'user:read', 'user:update', 'user:delete', 'role:read', 'lead:create', 'lead:read', 'lead:update', 'lead:delete'] },
    { name: 'management', isSystemRole: true, permissions: ['user:read', 'lead:create', 'lead:read', 'lead:update', 'lead:delete'] },
    { name: 'sales', isSystemRole: true, permissions: ['lead:create', 'lead:read', 'lead:update'] },
    { name: 'project_manager', isSystemRole: true, permissions: ['project:create', 'project:read', 'project:update', 'task:create', 'task:read', 'task:update'] },
    { name: 'employee', isSystemRole: true, permissions: ['task:read', 'task:update'] },
    { name: 'finance', isSystemRole: true, permissions: ['invoice:create', 'invoice:read', 'invoice:update', 'invoice:approve'] },
  ];

  for (const roleData of roles) {
    await Role.findOneAndUpdate({ name: roleData.name }, roleData, { upsert: true, new: true });
  }
};
