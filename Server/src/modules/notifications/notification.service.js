import Notification from './notification.model.js';
import AppError from '../../core/utils/AppError.js';
import logger from '../../core/utils/logger.js';

/**
 * Create a notification.
 * Called by services and background jobs — not typically by controllers directly.
 */
export const createNotification = async (data) => {
  const notification = await Notification.create(data);
  logger.info(`Notification created: ${data.type} for ${data.recipient}`);
  return notification;
};

/**
 * Create notifications for multiple recipients.
 */
export const createBulkNotifications = async (recipients, data) => {
  const notifications = recipients.map((recipientId) => ({
    ...data,
    recipient: recipientId,
  }));

  const created = await Notification.insertMany(notifications);
  logger.info(`Bulk notifications created: ${created.length} notifications`);
  return created;
};

/**
 * Get notifications for a user with pagination.
 */
export const getNotifications = async (userId, query = {}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter = { recipient: userId };

  if (query.type) filter.type = query.type;
  if (query.isRead !== undefined) filter.isRead = query.isRead === 'true';

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get unread count for a user.
 */
export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
  return count;
};

/**
 * Mark a notification as read.
 */
export const markAsRead = async (id, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true },
  );

  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  return notification;
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  return { modifiedCount: result.modifiedCount };
};

export default {
  createNotification,
  createBulkNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
