import { createClient } from 'redis';
import logger from '../utils/logger.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
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
    throw error;
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
