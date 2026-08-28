import * as notificationService from './notification.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const getNotifications = async (req, res) => {
  const result = await notificationService.getNotifications(
    req.user._id,
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
  );
  return sendSuccess(res, { data: result.notifications, meta: result.meta });
};

export const getUnreadCount = async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  return sendSuccess(res, { data: { count } });
};

export const markAsRead = async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  return sendSuccess(res, { data: notification });
};

export const markAllAsRead = async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  return sendSuccess(res, { data: result });
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
