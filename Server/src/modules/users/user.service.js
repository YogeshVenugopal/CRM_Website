import User from './user.model.js';
import Role from './role.model.js';
import AppError from '../../core/utils/AppError.js';
import logger from '../../core/utils/logger.js';

/**
 * Get all users with pagination, search, and filtering
 */
export const getUsers = async ({ page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = -1, role, isActive }) => {
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };

  const [users, total] = await Promise.all([
    User.find(filter).populate('role').sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (id) => {
  const user = await User.findById(id).populate('role');
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return user;
};

/**
 * Create user (admin)
 */
export const createUser = async ({ name, email, password, role, phone }) => {
  // Check if role exists
  const roleDoc = await Role.findById(role);
  if (!roleDoc) {
    throw new AppError('Invalid role', 400, 'INVALID_ROLE');
  }

  // Check for existing email
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
  }

  const user = await User.create({
    name,
    email,
    password, // Virtual setter maps to passwordHash, pre-save hook hashes it
    role,
    phone,
  });

  logger.info(`User created: ${user.email} with role ${roleDoc.name}`);
  return user;
};

/**
 * Update user
 */
export const updateUser = async (id, updates) => {
  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).populate('role');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
};

/**
 * Activate user
 */
export const activateUser = async (id) => {
  const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true }).populate('role');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  logger.info(`User activated: ${user.email}`);
  return user;
};

/**
 * Deactivate user
 */
export const deactivateUser = async (id) => {
  const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate('role');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  logger.info(`User deactivated: ${user.email}`);
  return user;
};

/**
 * Update user role
 */
export const updateUserRole = async (id, roleId) => {
  const roleDoc = await Role.findById(roleId);
  if (!roleDoc) {
    throw new AppError('Invalid role', 400, 'INVALID_ROLE');
  }

  const user = await User.findByIdAndUpdate(id, { role: roleId }, { new: true })
    .populate('role');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  logger.info(`User role updated: ${user.email} → ${roleDoc.name}`);
  return user;
};

/**
 * Get all roles
 */
export const getRoles = async () => {
  return Role.find().sort({ name: 1 });
};

export default { getUsers, getUserById, createUser, updateUser, activateUser, deactivateUser, updateUserRole, getRoles };
