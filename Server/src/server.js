import http from 'http';
import app from './app.js';
import connectMongoDB, { disconnectMongoDB } from './core/config/mongodb.js';
import { connectRedis, disconnectRedis } from './core/config/redis.js';
import { initializeSocket, getIO } from './sockets/index.js';
import logger from './core/utils/logger.js';

const PORT = process.env.PORT || 3000;

/**
 * Start HTTP server after DB connections are established
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Connect to Redis
    await connectRedis();

    // Create HTTP server and initialize Socket.IO
    const httpServer = http.createServer(app);
    initializeSocket(httpServer);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
    });

    // ─── Graceful Shutdown ──────────────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        try {
          // Close Socket.IO
          const io = getIO();
          if (io) io.close();

          await disconnectMongoDB();
          await disconnectRedis();
          logger.info('All connections closed. Exiting.');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force exit after 30 seconds if graceful shutdown stalls
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ─── Global Error Handlers ───────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
