import 'dotenv/config';
import mongoose from 'mongoose';
import Role from '../../modules/users/role.model.js';
import logger from '../utils/logger.js';

const DEFAULT_ROLES = [
  {
    name: 'admin',
    isSystemRole: true,
    description: 'Full system access',
    permissions: [
      'user:create', 'user:read', 'user:update', 'user:delete',
      'role:create', 'role:read', 'role:update', 'role:delete',
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
      'dashboard:read',
      'settings:read', 'settings:update',
    ],
  },
  {
    name: 'management',
    isSystemRole: true,
    description: 'Management access — can manage most resources',
    permissions: [
      'user:read',
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
      'dashboard:read',
    ],
  },
  {
    name: 'sales',
    isSystemRole: true,
    description: 'Sales team — manages leads, opportunities, clients',
    permissions: [
      'lead:create', 'lead:read', 'lead:update',
      'opportunity:create', 'opportunity:read', 'opportunity:update',
      'client:create', 'client:read', 'client:update',
      'quotation:create', 'quotation:read', 'quotation:update', 'quotation:send', 'quotation:accept', 'quotation:reject',
      'activity:create', 'activity:read', 'activity:update',
      'notification:read',
      'project:read',
      'dashboard:read',
    ],
  },
  {
    name: 'project_manager',
    isSystemRole: true,
    description: 'Project manager — manages projects and tasks',
    permissions: [
      'lead:read',
      'client:read', 'client:update',
      'project:create', 'project:read', 'project:update', 'project:delete',
      'task:create', 'task:read', 'task:update', 'task:delete',
      'activity:create', 'activity:read', 'activity:update', 'activity:delete',
      'notification:read',
      'quotation:read',
      'report:read',
      'dashboard:read',
    ],
  },
  {
    name: 'employee',
    isSystemRole: true,
    description: 'General employee — limited access',
    permissions: [
      'task:read', 'task:update',
      'activity:create', 'activity:read', 'activity:update',
      'notification:read',
      'project:read',
      'dashboard:read',
    ],
  },
  {
    name: 'finance',
    isSystemRole: true,
    description: 'Finance team — manages invoices and payments',
    permissions: [
      'client:read',
      'project:read',
      'invoice:create', 'invoice:read', 'invoice:update', 'invoice:send', 'invoice:approve', 'invoice:cancel',
      'payment:create', 'payment:read', 'payment:update',
      'quotation:read',
      'activity:read',
      'notification:read',
      'report:read', 'report:export',
      'dashboard:read',
    ],
  },
];

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    for (const roleData of DEFAULT_ROLES) {
      const existing = await Role.findOne({ name: roleData.name });

      if (existing) {
        // Update permissions if missing
        const missingPerms = roleData.permissions.filter((p) => !existing.permissions.includes(p));
        if (missingPerms.length > 0) {
          existing.permissions = [...new Set([...existing.permissions, ...roleData.permissions])];
          await existing.save();
          logger.info(`Updated role "${roleData.name}" — added ${missingPerms.length} missing permissions`);
        } else {
          logger.info(`Role "${roleData.name}" already up to date`);
        }
      } else {
        await Role.create(roleData);
        logger.info(`Created role "${roleData.name}"`);
      }
    }

    logger.info('Role seeding complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Role seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedRoles();
