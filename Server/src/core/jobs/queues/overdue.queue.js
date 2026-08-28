import { Queue } from 'bullmq';
import { getRedisClient } from '../../config/redis.js';

let overdueQueue = null;

export const getOverdueQueue = () => {
  if (!overdueQueue) {
    const redis = getRedisClient();
    if (redis) {
      overdueQueue = new Queue('overdue', {
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 50,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });
    }
  }
  return overdueQueue;
};

export const addOverdueJob = async (data) => {
  const queue = getOverdueQueue();
  if (queue) {
    return queue.add('sweep-overdue', data, {
      repeat: {
        pattern: '0 1 * * *', // Daily at 1 AM
      },
    });
  }
  return null;
};

export default { getOverdueQueue, addOverdueJob };
