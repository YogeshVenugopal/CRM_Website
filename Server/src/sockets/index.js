import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../modules/users/user.model.js';
import logger from '../core/utils/logger.js';

let io = null;

/**
 * Initialize Socket.IO with authentication.
 * @param {import('http').Server} httpServer
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id)
        .select('-passwordHash -refreshTokenHash -otp')
        .populate('role');

      if (!user || !user.isActive) {
        return next(new Error('User not found or deactivated'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    logger.info(`Socket connected: ${socket.user.email} (${socket.id})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-specific room
    if (socket.user.role?.name) {
      socket.join(`role:${socket.user.role.name}`);
    }

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.user.email} (${reason})`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

/**
 * Get the Socket.IO instance.
 */
export const getIO = () => io;

/**
 * Emit an event to a specific user.
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit an event to all users with a specific role.
 */
export const emitToRole = (roleName, event, data) => {
  if (io) {
    io.to(`role:${roleName}`).emit(event, data);
  }
};

/**
 * Broadcast an event to all connected clients.
 */
export const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default { initializeSocket, getIO, emitToUser, emitToRole, broadcast };
