import * as userService from './user.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

/**
 * GET /api/v1/users
 */
export const getUsers = async (req, res) => {
  const result = await userService.getUsers({
    page: req.pagination?.page || req.query.page,
    limit: req.pagination?.limit || req.query.limit,
    search: req.query.search,
    sortBy: req.pagination?.sortBy || req.query.sortBy,
    sortOrder: req.pagination?.sortOrder || (req.query.sortOrder === 'asc' ? 1 : -1),
    role: req.query.role,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
  });

  return sendSuccess(res, {
    data: result.users,
    meta: result.meta,
  });
};

/**
 * POST /api/v1/users
 */
export const createUser = async (req, res) => {
  const user = await userService.createUser(req.body);

  return sendSuccess(res, {
    data: user,
    statusCode: 201,
  });
};

/**
 * GET /api/v1/users/:id
 */
export const getUserById = async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  return sendSuccess(res, { data: user });
};

/**
 * PATCH /api/v1/users/:id
 */
export const updateUser = async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);

  return sendSuccess(res, { data: user });
};

/**
 * PATCH /api/v1/users/:id/activate
 */
export const activateUser = async (req, res) => {
  const user = await userService.activateUser(req.params.id);

  return sendSuccess(res, { data: user });
};

/**
 * PATCH /api/v1/users/:id/deactivate
 */
export const deactivateUser = async (req, res) => {
  const user = await userService.deactivateUser(req.params.id);

  return sendSuccess(res, { data: user });
};

/**
 * PATCH /api/v1/users/:id/role
 */
export const updateUserRole = async (req, res) => {
  const user = await userService.updateUserRole(req.params.id, req.body.role);

  return sendSuccess(res, { data: user });
};

/**
 * GET /api/v1/roles
 */
export const getRoles = async (req, res) => {
  const roles = await userService.getRoles();

  return sendSuccess(res, { data: roles });
};

export default {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
  updateUserRole,
  getRoles,
};
