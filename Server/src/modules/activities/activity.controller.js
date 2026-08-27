import * as activityService from './activity.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

/**
 * POST /api/v1/activities
 */
export const createActivity = async (req, res) => {
  const activity = await activityService.createActivity(req.body, req.user);

  return sendSuccess(res, { data: activity, statusCode: 201 });
};

/**
 * GET /api/v1/activities
 */
export const getActivities = async (req, res) => {
  const result = await activityService.getActivities(req.query, req.user);

  return sendSuccess(res, { data: result.activities, meta: result.meta });
};

/**
 * GET /api/v1/activities/:id
 */
export const getActivityById = async (req, res) => {
  const activity = await activityService.getActivityById(req.params.id, req.user);

  return sendSuccess(res, { data: activity });
};

/**
 * PATCH /api/v1/activities/:id
 */
export const updateActivity = async (req, res) => {
  const activity = await activityService.updateActivity(req.params.id, req.body, req.user);

  return sendSuccess(res, { data: activity });
};

/**
 * DELETE /api/v1/activities/:id
 */
export const deleteActivity = async (req, res) => {
  await activityService.deleteActivity(req.params.id, req.user);

  return sendSuccess(res, { data: { message: 'Activity deleted successfully' } });
};

/**
 * PATCH /api/v1/activities/:id/complete
 */
export const completeActivity = async (req, res) => {
  const activity = await activityService.completeActivity(req.params.id, req.user);

  return sendSuccess(res, { data: activity });
};

/**
 * GET /api/v1/leads/:id/activities — convenience endpoint
 */
export const getLeadActivities = async (req, res) => {
  const result = await activityService.getActivitiesForResource(
    'Lead',
    req.params.id,
    req.query,
    req.user,
  );

  return sendSuccess(res, { data: result.activities, meta: result.meta });
};

/**
 * GET /api/v1/activities/follow-ups — pending follow-ups for current user
 */
export const getPendingFollowUps = async (req, res) => {
  const followUps = await activityService.getPendingFollowUps(req.user._id);

  return sendSuccess(res, { data: followUps });
};

export default {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  completeActivity,
  getLeadActivities,
  getPendingFollowUps,
};
