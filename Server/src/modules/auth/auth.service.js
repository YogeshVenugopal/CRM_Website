import bcrypt from 'bcryptjs';
import User from '../users/user.model.js';
import Role from '../users/role.model.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../core/utils/tokens.js';
import { getRedisClient } from '../../core/config/redis.js';
import AppError from '../../core/utils/AppError.js';
import logger from '../../core/utils/logger.js';

const REFRESH_TOKEN_HASH_ROUNDS = 10;

/**
 * Hash a refresh token for storage
 */
const hashToken = async (token) => {
  return bcrypt.hash(token, REFRESH_TOKEN_HASH_ROUNDS);
};

/**
 * Generate token pair and store session in Redis
 */
const createSession = async (user) => {
  const payload = { id: user._id, email: user.email, role: user.role?._id || user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Hash refresh token for storage
  const refreshTokenHash = await hashToken(refreshToken);

  // Store session in Redis
  const redis = getRedisClient();
  if (redis) {
    const refreshExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN, 10) || 7 * 24 * 60 * 60;
    await redis.set(`session:${user._id}`, refreshTokenHash, { EX: refreshExpiry });
  }

  // Update user's refreshTokenHash in DB (backup)
  await User.findByIdAndUpdate(user._id, { refreshTokenHash });

  return { accessToken, refreshToken };
};

/**
 * Set cookies on response
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const configuredDomain = process.env.COOKIE_DOMAIN;
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    domain: configuredDomain && configuredDomain !== 'localhost' ? configuredDomain : undefined,
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth', // Restrict refresh cookie to auth routes
  });
};

/**
 * Register a new user
 */
export const register = async (name, email, password, roleName, res) => {
  // Check if email already exists
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
  }

  // Find the role
  const role = await Role.findOne({ name: roleName || 'employee' });
  if (!role) {
    throw new AppError('Invalid role', 400, 'INVALID_ROLE');
  }

  // Create user
  const user = new User({
    name,
    email,
    role: role._id,
    isActive: true,
  });
  user.password = password; // Virtual setter → passwordHash
  await user.save();

  // Reload with populated role for session creation
  const populatedUser = await User.findById(user._id).populate('role');

  const { accessToken, refreshToken } = await createSession(populatedUser);
  setTokenCookies(res, accessToken, refreshToken);

  logger.info(`User registered: ${user.email} with role ${role.name}`);

  return {
    user: populatedUser.toJSON(),
    accessToken,
  };
};

/**
 * Login
 */
export const login = async (email, password, res) => {
  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Contact administrator.', 403, 'ACCOUNT_DEACTIVATED');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await createSession(user);

  setTokenCookies(res, accessToken, refreshToken);

  logger.info(`User logged in: ${user.email}`);

  return {
    user: user.toJSON(),
    accessToken,
  };
};

/**
 * Refresh tokens
 */
export const refresh = async (refreshTokenFromCookie, res) => {
  if (!refreshTokenFromCookie) {
    throw new AppError('Refresh token required', 401, 'REFRESH_TOKEN_MISSING');
  }

  // Verify JWT
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenFromCookie);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  // Check Redis session
  const redis = getRedisClient();
  if (redis) {
    const storedHash = await redis.get(`session:${decoded.id}`);
    if (!storedHash) {
      throw new AppError('Session expired. Please login again.', 401, 'SESSION_EXPIRED');
    }

    // Verify the stored hash matches
    const isValid = await bcrypt.compare(refreshTokenFromCookie, storedHash);
    if (!isValid) {
      // Potential token reuse — invalidate all sessions for this user
      await redis.del(`session:${decoded.id}`);
      throw new AppError('Refresh token reuse detected. Session invalidated.', 401, 'TOKEN_REUSE');
    }
  }

  // Load user
  const user = await User.findById(decoded.id).populate('role');
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated', 401, 'USER_NOT_FOUND');
  }

  // Rotate: create new session (invalidates old refresh token)
  const { accessToken, refreshToken: newRefreshToken } = await createSession(user);

  setTokenCookies(res, accessToken, newRefreshToken);

  return { accessToken };
};

/**
 * Logout
 */
export const logout = async (userId) => {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(`session:${userId}`);
  }

  // Clear refreshTokenHash in DB
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });

  logger.info(`User logged out: ${userId}`);
};

/**
 * Get public user list for login page (name, email, role name)
 */
export const getPublicUsers = async () => {
  const users = await User.find({ isActive: true })
    .select('name email role')
    .populate('role', 'name')
    .sort('name');

  return users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role?.name || 'employee',
  }));
};

/**
 * Get current user
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId).populate('role');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
};

export default { register, login, refresh, logout, getMe, getPublicUsers };
