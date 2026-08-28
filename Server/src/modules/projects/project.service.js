import Project from './project.model.js';
import Task from '../tasks/task.model.js';
import Client from '../clients/client.model.js';
import User from '../users/user.model.js';
import Activity from '../activities/activity.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if user can access a project.
 * Manager, team members, or privileged roles can access.
 */
const assertProjectAccess = (project, user) => {
  const roleName = user.role?.name;
  if (PRIVILEGED_ROLES.includes(roleName)) return true;

  if (project.manager?.toString() === user._id?.toString()) return true;
  if (project.createdBy?.toString() === user._id?.toString()) return true;

  // Team members can read
  if (project.team?.some((id) => id.toString() === user._id?.toString())) return true;

  // Project managers can access any project
  if (roleName === 'project_manager') return true;

  return false;
};

const assertProjectWriteAccess = (project, user) => {
  if (!assertProjectAccess(project, user)) {
    throw new AppError('You do not have access to this project', 403, 'PROJECT_ACCESS_DENIED');
  }
};

const buildFilter = (query, user) => {
  const filter = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.status) filter.status = query.status;
  if (query.client) filter.client = query.client;
  if (query.manager) filter.manager = query.manager;

  // Ownership visibility: employees only see projects they're assigned to
  const roleName = user.role?.name;
  if (roleName === 'employee') {
    filter.$or = [
      { manager: user._id },
      { team: user._id },
      { createdBy: user._id },
    ];
  }

  return filter;
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new project.
 */
export const createProject = async (data, user) => {
  // Validate client exists
  const client = await Client.findById(data.client);
  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // Validate manager
  if (data.manager) {
    const manager = await User.findById(data.manager);
    if (!manager) {
      throw new AppError('Project manager not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!manager.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  // Validate team members
  if (data.team && data.team.length > 0) {
    const members = await User.find({ _id: { $in: data.team }, isActive: true });
    if (members.length !== data.team.length) {
      throw new AppError('One or more team members are invalid or inactive', 400, 'INVALID_TEAM');
    }
  }

  const project = await Project.create({
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    createdBy: user._id,
  });

  logger.info(`Project created: ${project.name} by ${user.email}`);
  return project;
};

/**
 * List projects with search, filters, and pagination.
 */
export const getProjects = async (query, user) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user);

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  if (query.search) {
    sort.score = { $meta: 'textScore' };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('client', 'companyName')
      .populate('manager', 'name email')
      .populate('createdBy', 'name email')
      .lean(),
    Project.countDocuments(filter),
  ]);

  return {
    projects,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single project by ID.
 */
export const getProjectById = async (id, user) => {
  const project = await Project.findById(id)
    .populate('client', 'companyName primaryContact')
    .populate('sourceOpportunity', 'title stage value')
    .populate('sourceQuotation', 'quotationNumber total')
    .populate('manager', 'name email')
    .populate('team', 'name email')
    .populate('createdBy', 'name email')
    .lean();

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  return project;
};

/**
 * Update a project.
 */
export const updateProject = async (id, updates, user) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  assertProjectWriteAccess(project, user);

  // Prevent changing critical fields
  delete updates.client;
  delete updates.sourceOpportunity;
  delete updates.sourceQuotation;
  delete updates.createdBy;
  delete updates.status;

  if (updates.startDate) updates.startDate = new Date(updates.startDate);
  if (updates.endDate) updates.endDate = new Date(updates.endDate);

  Object.assign(project, updates);
  await project.save();

  logger.info(`Project updated: ${project.name} by ${user.email}`);
  return project;
};

/**
 * Delete a project (admin/management only).
 */
export const deleteProject = async (id, user) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const roleName = user.role?.name;
  if (!PRIVILEGED_ROLES.includes(roleName)) {
    throw new AppError('Only admin or management can delete projects', 403, 'PROJECT_ACCESS_DENIED');
  }

  await Project.findByIdAndDelete(id);
  logger.info(`Project deleted: ${project.name} by ${user.email}`);
};

// ─── Business Actions ────────────────────────────────────────────────────────

/**
 * Change project status with transition validation.
 */
export const changeStatus = async (id, newStatus, user) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  assertProjectWriteAccess(project, user);

  if (!Project.isValidTransition(project.status, newStatus)) {
    throw new AppError(
      `Cannot transition from "${project.status}" to "${newStatus}"`,
      400,
      'INVALID_PROJECT_STATUS_TRANSITION',
      { currentStatus: project.status, requestedStatus: newStatus },
    );
  }

  const previousStatus = project.status;
  project.status = newStatus;

  if (newStatus === 'completed') {
    project.endDate = new Date();
  }

  await project.save();

  logger.info(`Project status: ${project.name} ${previousStatus} → ${newStatus} by ${user.email}`);
  return { project, previousStatus };
};

/**
 * Assign a project manager.
 */
export const assignManager = async (id, managerId, user) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  assertProjectWriteAccess(project, user);

  if (managerId) {
    const manager = await User.findById(managerId);
    if (!manager) {
      throw new AppError('User not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!manager.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  project.manager = managerId;
  await project.save();

  logger.info(`Project manager assigned: ${project.name} → ${managerId || 'none'} by ${user.email}`);
  return project;
};

/**
 * Assign team members to a project.
 */
export const assignTeam = async (id, teamIds, user) => {
  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  assertProjectWriteAccess(project, user);

  if (teamIds && teamIds.length > 0) {
    const members = await User.find({ _id: { $in: teamIds }, isActive: true });
    if (members.length !== teamIds.length) {
      throw new AppError('One or more team members are invalid or inactive', 400, 'INVALID_TEAM');
    }
  }

  project.team = teamIds || [];
  await project.save();

  logger.info(`Project team updated: ${project.name} (${teamIds.length} members) by ${user.email}`);
  return project;
};

/**
 * Get project tasks.
 */
export const getProjectTasks = async (projectId, query, user) => {
  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const filter = { project: projectId };

  if (query.status) filter.status = query.status;
  if (query.assignee) filter.assignee = query.assignee;
  if (query.priority) filter.priority = query.priority;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .lean(),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Get project activities (timeline).
 */
export const getProjectActivities = async (projectId, user) => {
  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const activities = await Activity.find({ 'relatedTo.type': 'Project', 'relatedTo.id': projectId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('owner', 'name email')
    .lean();

  return activities;
};

/**
 * Create a project from Opportunity Won handover.
 * This is the integration point for the Won → Project workflow.
 */
export const createFromHandover = async (data) => {
  const project = await Project.create(data);
  logger.info(`Project created from handover: ${project.name} (${project._id})`);
  return project;
};

export default {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  changeStatus,
  assignManager,
  assignTeam,
  getProjectTasks,
  getProjectActivities,
  createFromHandover,
};
