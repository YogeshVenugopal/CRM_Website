import { verifyAccessToken } from '../utils/tokens.js';
import { getRedisClient } from '../config/redis.js';
import AppError from '../utils/AppError.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import User from '../../modules/users/user.model.js';

/**
 * Authenticate middleware:
 * 1. Read access token from Authorization header OR httpOnly cookie
 * 2. Verify the JWT
 * 3. Look up user + role from DB
 * 4. Attach to req.user
 */
export const authenticate = asyncWrapper(async (req, res, next) => {
  // Read token from header or cookie
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  // Verify JWT
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid access token', 401, 'TOKEN_INVALID');
  }

  // Check Redis for active session (refresh token exists = session active)
  const redis = getRedisClient();
  if (redis) {
    const sessionExists = await redis.get(`session:${decoded.id}`);
    if (!sessionExists) {
      throw new AppError('Session expired. Please login again.', 401, 'SESSION_EXPIRED');
    }
  }

  // Load user with role
  const user = await User.findById(decoded.id)
    .select('-passwordHash -refreshTokenHash -otp')
    .populate('role');

  if (!user) {
    throw new AppError('User not found', 401, 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
  }

  req.user = user;
  next();
});

/**
 * Optional auth — attaches user if token present, but doesn't reject.
 */
export const optionalAuth = asyncWrapper(async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id)
        .select('-passwordHash -refreshTokenHash -otp')
        .populate('role');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (_error) {
      // Token invalid — continue without user
    }
  }
  next();
});

export default authenticate;
