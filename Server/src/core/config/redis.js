import { createClient } from 'redis';
import logger from '../utils/logger.js';

let redisClient = null;

export const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  const requireRedis = process.env.REQUIRE_REDIS === 'true';

  if (!redisUrl) {
    logger.warn('REDIS_URL is not set. Redis-backed sessions, queues, and realtime jobs are disabled.');
    return null;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
      },
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error(`Redis connection failed: ${error.message}`);
    redisClient = null;

    if (requireRedis) {
      throw error;
    }

    logger.warn('Continuing without Redis. Set REQUIRE_REDIS=true to make Redis mandatory.');
    return null;
  }
};

export const getRedisClient = () => {
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis disconnected gracefully');
    redisClient = null;
  }
};
