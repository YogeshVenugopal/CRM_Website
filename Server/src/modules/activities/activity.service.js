import Activity from './activity.model.js';
import Lead from '../leads/lead.model.js';
import Opportunity from '../pipeline/opportunity.model.js';
import Client from '../clients/client.model.js';
import Quotation from '../quotations/quotation.model.js';
import Project from '../projects/project.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];
const MAX_TIMELINE_LIMIT = 50;

// ─── Resource Access Map ─────────────────────────────────────────────────────
// Each resource type maps to its Mongoose model and access-check logic.
// This allows the activity module to verify access to any parent resource.
const RESOURCE_ACCESSORS = {
  Lead: {
    model: Lead,
    /**
     * Check if user can access this lead.
     * Sales users can only access leads assigned to them or created by them.
     */
    canAccess: (resource, user) => {
      const roleName = user.role?.name;
      if (PRIVILEGED_ROLES.includes(roleName)) return true;
      if (roleName === 'sales') {
        return (
          resource.assignedTo?.toString() === user._id?.toString() ||
          resource.createdBy?.toString() === user._id?.toString()
        );
      }
      // Other roles: check read permission (handled by RBAC middleware at route level)
      return true;
    },
  },
  Opportunity: {
    model: Opportunity,
    canAccess: (resource, user) => {
      const roleName = user.role?.name;
      if (PRIVILEGED_ROLES.includes(roleName)) return true;
      if (roleName === 'sales') {
        return (
          resource.assignedTo?.toString() === user._id?.toString() ||
          resource.createdBy?.toString() === user._id?.toString()
        );
      }
      return true;
    },
  },
  Client: {
    model: Client,
    canAccess: (resource, user) => {
      const roleName = user.role?.name;
      if (PRIVILEGED_ROLES.includes(roleName)) return true;
      if (roleName === 'sales') {
        return (
          resource.accountOwner?.toString() === user._id?.toString() ||
          resource.createdBy?.toString() === user._id?.toString()
        );
      }
      return true;
    },
  },
  Quotation: {
    model: Quotation,
    canAccess: (resource, user) => {
      const roleName = user.role?.name;
      if (PRIVILEGED_ROLES.includes(roleName)) return true;
      if (roleName === 'sales') {
        return resource.createdBy?.toString() === user._id?.toString();
      }
      return true;
    },
  },
  Project: {
    model: Project,
    canAccess: (resource, user) => {
      const roleName = user.role?.name;
      if (PRIVILEGED_ROLES.includes(roleName)) return true;
      if (roleName === 'project_manager') return true;
      if (resource.manager?.toString() === user._id?.toString()) return true;
      if (resource.createdBy?.toString() === user._id?.toString()) return true;
      if (resource.team?.some((id) => id.toString() === user._id?.toString())) return true;
      return false;
    },
  },
};

/**
 * Validate that the related resource exists and user can access it.
 */
const validateRelatedResource = async (relatedTo, user) => {
  const accessor = RESOURCE_ACCESSORS[relatedTo.type];
  if (!accessor) {
    throw new AppError('Invalid related resource type', 400, 'INVALID_RELATED_RESOURCE_TYPE');
  }

  const resource = await accessor.model.findById(relatedTo.id);
  if (!resource) {
    throw new AppError(`${relatedTo.type} not found`, 404, 'RELATED_RESOURCE_NOT_FOUND');
  }

  if (!accessor.canAccess(resource, user)) {
    throw new AppError(
      `You do not have access to this ${relatedTo.type}`,
      403,
      'ACTIVITY_ACCESS_DENIED',
    );
  }

  return resource;
};

/**
 * Assert user can modify an activity (owner or privileged).
 */
const assertActivityAccess = (activity, user) => {
  const isOwner = activity.owner?.toString() === user._id?.toString();
  const isPrivileged = assertOwnershipOrPrivileged(null, user, PRIVILEGED_ROLES);

  if (!isOwner && !isPrivileged) {
    throw new AppError('You do not have access to this activity', 403, 'ACTIVITY_ACCESS_DENIED');
  }
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new activity.
 * Validates the related resource exists and user has access.
 */
export const createActivity = async (data, user) => {
  // Validate the parent resource exists and user can access it
  await validateRelatedResource(data.relatedTo, user);

  const activity = await Activity.create({
    ...data,
    owner: user._id,
  });

  logger.info(`Activity created: ${activity.type} on ${data.relatedTo.type} by ${user.email}`);
  return activity;
};

/**
 * Get a single activity by ID.
 */
export const getActivityById = async (id, user) => {
  const activity = await Activity.findById(id)
    .populate('owner', 'name email')
    .lean();

  if (!activity) {
    throw new AppError('Activity not found', 404, 'ACTIVITY_NOT_FOUND');
  }

  // Verify access to parent resource
  await validateRelatedResource(activity.relatedTo, user);

  return activity;
};

/**
 * Update an activity.
 */
export const updateActivity = async (id, updates, user) => {
  const activity = await Activity.findById(id);
  if (!activity) {
    throw new AppError('Activity not found', 404, 'ACTIVITY_NOT_FOUND');
  }

  assertActivityAccess(activity, user);

  // Prevent changing owner, relatedTo, or completedAt through generic update
  delete updates.owner;
  delete updates.relatedTo;
  delete updates.completedAt;

  Object.assign(activity, updates);
  await activity.save();

  logger.info(`Activity updated: ${activity.type} by ${user.email}`);
  return activity;
};

/**
 * Delete an activity.
 */
export const deleteActivity = async (id, user) => {
  const activity = await Activity.findById(id);
  if (!activity) {
    throw new AppError('Activity not found', 404, 'ACTIVITY_NOT_FOUND');
  }

  assertActivityAccess(activity, user);

  await Activity.findByIdAndDelete(id);
  logger.info(`Activity deleted: ${activity.type} by ${user.email}`);
};

// ─── Timeline & Cursor Pagination ────────────────────────────────────────────

/**
 * List activities with cursor-based pagination.
 * Supports filtering by related resource, type, owner, completion status.
 */
export const getActivities = async (query, user) => {
  const limit = Math.min(query.limit || 20, MAX_TIMELINE_LIMIT);

  const filter = {};

  // Related resource filter
  if (query.relatedToType && query.relatedToId) {
    filter['relatedTo.type'] = query.relatedToType;
    filter['relatedTo.id'] = query.relatedToId;

    // Validate access to parent resource
    await validateRelatedResource({ type: query.relatedToType, id: query.relatedToId }, user);
  } else if (query.relatedToType) {
    filter['relatedTo.type'] = query.relatedToType;
  }

  // Type filter
  if (query.type) {
    filter.type = query.type;
  }

  // Owner filter
  if (query.owner) {
    filter.owner = query.owner;
  }

  // Completion filter
  if (query.completed === 'true') {
    filter.completedAt = { $ne: null };
  } else if (query.completed === 'false') {
    filter.completedAt = null;
  }

  // Cursor-based pagination (before a given activity ID)
  if (query.before) {
    const cursorActivity = await Activity.findById(query.before).lean();
    if (!cursorActivity) {
      throw new AppError('Invalid cursor', 400, 'INVALID_CURSOR');
    }
    filter.createdAt = { $lt: cursorActivity.createdAt };
  }

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1) // Fetch one extra to determine if there are more
    .populate('owner', 'name email')
    .lean();

  const hasMore = activities.length > limit;
  const data = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore ? data[data.length - 1]._id.toString() : null;

  return {
    activities: data,
    meta: {
      nextCursor,
      hasMore,
    },
  };
};

/**
 * List activities for a specific resource (convenience endpoint).
 */
export const getActivitiesForResource = async (resourceType, resourceId, query, user) => {
  return getActivities(
    { ...query, relatedToType: resourceType, relatedToId: resourceId },
    user,
  );
};

// ─── Follow-Up Handling ──────────────────────────────────────────────────────

/**
 * Complete a follow-up activity.
 */
export const completeActivity = async (id, user) => {
  const activity = await Activity.findById(id);
  if (!activity) {
    throw new AppError('Activity not found', 404, 'ACTIVITY_NOT_FOUND');
  }

  assertActivityAccess(activity, user);

  if (activity.type !== 'follow_up') {
    throw new AppError('Only follow-up activities can be completed', 400, 'INVALID_ACTIVITY_TYPE');
  }

  if (activity.completedAt) {
    throw new AppError('Follow-up is already completed', 400, 'FOLLOW_UP_ALREADY_COMPLETED');
  }

  activity.completedAt = new Date();
  await activity.save();

  logger.info(`Follow-up completed: ${activity._id} by ${user.email}`);
  return activity;
};

/**
 * Get pending follow-ups for a user.
 */
export const getPendingFollowUps = async (userId) => {
  const activities = await Activity.find({
    owner: userId,
    type: 'follow_up',
    completedAt: null,
    dueDate: { $ne: null },
  })
    .sort({ dueDate: 1 })
    .populate('owner', 'name email')
    .lean();

  return activities;
};

export default {
  createActivity,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivities,
  getActivitiesForResource,
  completeActivity,
  getPendingFollowUps,
};
