import { Queue } from 'bullmq';
import { getRedisClient } from '../../config/redis.js';

let notificationQueue = null;

export const getNotificationQueue = () => {
  if (!notificationQueue) {
    const redis = getRedisClient();
    if (redis) {
      notificationQueue = new Queue('notifications', {
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    }
  }
  return notificationQueue;
};

export const addNotificationJob = async (data) => {
  const queue = getNotificationQueue();
  if (queue) {
    return queue.add('send-notification', data);
  }
  return null;
};

export default { getNotificationQueue, addNotificationJob };
