import * as authService from './auth.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

/**
 * GET /api/v1/auth/public-users
 * Returns basic info about active users for the login page.
 * Only exposes name, email, and role — no sensitive data.
 */
export const publicUsers = async (_req, res) => {
  const users = await authService.getPublicUsers();
  return sendSuccess(res, { data: users });
};

/**
 * POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await authService.register(name, email, password, role, res);

  return sendSuccess(res, {
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
    statusCode: 201,
  });
};

/**
 * POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, res);

  return sendSuccess(res, {
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
    statusCode: 200,
  });
};

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const result = await authService.refresh(refreshToken, res);

  return sendSuccess(res, {
    data: { accessToken: result.accessToken },
  });
};

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  await authService.logout(req.user._id);

  // Clear cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });

  return sendSuccess(res, { data: { message: 'Logged out successfully' } });
};

/**
 * GET /api/v1/auth/me
 */
export const me = async (req, res) => {
  const user = await authService.getMe(req.user._id);

  return sendSuccess(res, { data: user });
};

export default { register, login, refresh, logout, me };
