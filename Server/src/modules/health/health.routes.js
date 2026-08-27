import { Router } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../../core/config/redis.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

const router = Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    services: {
      express: { status: 'up' },
      mongodb: { status: mongoose.connection.readyState === 1 ? 'up' : 'down' },
      redis: { status: 'down' },
    },
  };

  // Check Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      health.services.redis.status = 'up';
    }
  } catch (_error) {
    health.services.redis.status = 'down';
  }

  const allUp = Object.values(health.services).every((s) => s.status === 'up');
  health.status = allUp ? 'healthy' : 'degraded';

  const statusCode = allUp ? 200 : 503;

  return sendSuccess(res, {
    data: health,
    statusCode,
  });
});

export default router;
