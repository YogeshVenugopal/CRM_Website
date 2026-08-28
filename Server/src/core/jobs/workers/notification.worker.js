import { Worker } from 'bullmq';
import { getRedisClient } from '../../config/redis.js';
import * as notificationService from '../../../modules/notifications/notification.service.js';
import logger from '../../utils/logger.js';

let notificationWorker = null;

export const startNotificationWorker = () => {
  const redis = getRedisClient();
  if (!redis) {
    logger.warn('Redis not available — notification worker not started');
    return null;
  }

  notificationWorker = new Worker(
    'notifications',
    async (job) => {
      const { recipient, type, title, message, resourceType, resourceId } = job.data;

      try {
        await notificationService.createNotification({
          recipient,
          type,
          title,
          message,
          resourceType: resourceType || null,
          resourceId: resourceId || null,
        });

        logger.info(`Notification job processed: ${type} for ${recipient}`);
        return { success: true };
      } catch (error) {
        logger.error(`Notification job failed: ${error.message}`);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5,
    },
  );

  notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification job ${job.id} failed: ${err.message}`);
  });

  notificationWorker.on('completed', (job) => {
    logger.debug(`Notification job ${job.id} completed`);
  });

  logger.info('Notification worker started');
  return notificationWorker;
};

export const stopNotificationWorker = async () => {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
    logger.info('Notification worker stopped');
  }
};

export default { startNotificationWorker, stopNotificationWorker };
