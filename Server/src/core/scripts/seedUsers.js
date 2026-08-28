import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../../modules/users/user.model.js';
import Role from '../../modules/users/role.model.js';
import logger from '../utils/logger.js';

const DEMO_USERS = [
  { name: 'Alex Vance', email: 'admin@company.com', password: 'password123', roleName: 'admin' },
  { name: 'Eleanor Vance', email: 'management@company.com', password: 'password123', roleName: 'management' },
  { name: 'Marcus Sterling', email: 'sales@company.com', password: 'password123', roleName: 'sales' },
  { name: 'Sarah Jenkins', email: 'pm@company.com', password: 'password123', roleName: 'project_manager' },
  { name: 'David Chen', email: 'employee@company.com', password: 'password123', roleName: 'employee' },
  { name: 'Rachel Green', email: 'finance@company.com', password: 'password123', roleName: 'finance' },
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for user seeding');

    for (const userData of DEMO_USERS) {
      const role = await Role.findOne({ name: userData.roleName });
      if (!role) {
        logger.warn(`Role "${userData.roleName}" not found — skipping user "${userData.email}". Run seedRoles first.`);
        continue;
      }

      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        logger.info(`User "${userData.email}" already exists — updating role if needed`);
        if (String(existing.role) !== String(role._id)) {
          existing.role = role._id;
          await existing.save({ validateBeforeSave: false });
          logger.info(`Updated role for "${userData.email}" → ${userData.roleName}`);
        }
        continue;
      }

      // Use the virtual password setter so it gets hashed by the pre-save hook
      const user = new User({
        name: userData.name,
        email: userData.email,
        role: role._id,
        isActive: true,
      });
      user.password = userData.password;
      await user.save();

      logger.info(`Created user "${userData.email}" (${userData.roleName})`);
    }

    logger.info('User seeding complete');
    logger.info('---');
    logger.info('Login credentials:');
    DEMO_USERS.forEach((u) => {
      logger.info(`  ${u.email} / ${u.password} (${u.roleName})`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('User seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedUsers();
