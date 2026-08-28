import { Worker } from 'bullmq';
import { getRedisClient } from '../../config/redis.js';
import * as invoiceService from '../../../modules/finance/invoice.service.js';
import * as notificationService from '../../../modules/notifications/notification.service.js';
import Invoice from '../../../modules/finance/invoice.model.js';
import logger from '../../utils/logger.js';

let overdueWorker = null;

export const startOverdueWorker = () => {
  const redis = getRedisClient();
  if (!redis) {
    logger.warn('Redis not available — overdue worker not started');
    return null;
  }

  overdueWorker = new Worker(
    'overdue',
    async (job) => {
      try {
        // Mark overdue invoices
        const count = await invoiceService.markOverdueInvoices();

        if (count > 0) {
          // Get newly overdue invoices and create notifications
          const overdueInvoices = await Invoice.find({
            status: 'overdue',
          })
            .populate('client', 'companyName')
            .populate('createdBy', 'name email')
            .lean();

          for (const invoice of overdueInvoices) {
            if (invoice.createdBy) {
              await notificationService.createNotification({
                recipient: invoice.createdBy._id,
                type: 'invoice_overdue',
                title: `Invoice ${invoice.invoiceNumber} is overdue`,
                message: `Invoice for ${invoice.client?.companyName || 'client'} of ${invoice.currency} ${invoice.amountDue} is overdue.`,
                resourceType: 'Invoice',
                resourceId: invoice._id,
              });
            }
          }

          logger.info(`Overdue sweep: ${count} invoices marked as overdue, ${overdueInvoices.length} notifications created`);
        }

        return { count };
      } catch (error) {
        logger.error(`Overdue sweep failed: ${error.message}`);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1,
    },
  );

  overdueWorker.on('failed', (job, err) => {
    logger.error(`Overdue job ${job.id} failed: ${err.message}`);
  });

  logger.info('Overdue worker started');
  return overdueWorker;
};

export const stopOverdueWorker = async () => {
  if (overdueWorker) {
    await overdueWorker.close();
    overdueWorker = null;
    logger.info('Overdue worker stopped');
  }
};

export default { startOverdueWorker, stopOverdueWorker };
