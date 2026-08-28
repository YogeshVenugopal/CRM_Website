import { Router } from 'express';
import * as notificationController from './notification.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/notifications
router.get(
  '/',
  paginate,
  asyncWrapper(notificationController.getNotifications),
);

// GET /api/v1/notifications/unread-count
router.get(
  '/unread-count',
  asyncWrapper(notificationController.getUnreadCount),
);

// PATCH /api/v1/notifications/:id/read
router.patch(
  '/:id/read',
  asyncWrapper(notificationController.markAsRead),
);

// PATCH /api/v1/notifications/read-all
router.patch(
  '/read-all',
  asyncWrapper(notificationController.markAllAsRead),
);

export default router;
