import Task from './task.model.js';
import Project from '../projects/project.model.js';
import User from '../users/user.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Assert user can access the project this task belongs to.
 * Uses the same rules as project access.
 */
const assertTaskProjectAccess = async (task, user) => {
  const project = await Project.findById(task.project).lean();
  if (!project) {
    throw new AppError('Parent project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const roleName = user.role?.name;
  if (PRIVILEGED_ROLES.includes(roleName)) return project;
  if (roleName === 'project_manager') return project;
  if (project.manager?.toString() === user._id?.toString()) return project;
  if (project.createdBy?.toString() === user._id?.toString()) return project;
  if (project.team?.some((id) => id.toString() === user._id?.toString())) return project;

  // Employee: can access tasks assigned to them
  if (roleName === 'employee') {
    if (task.assignee?.toString() === user._id?.toString()) return project;
  }

  throw new AppError('You do not have access to this task', 403, 'TASK_ACCESS_DENIED');
};

/**
 * Detect circular dependencies.
 * Uses DFS from the given task.
 */
const detectCircularDependency = async (taskId, dependsOnIds) => {
  for (const depId of dependsOnIds) {
    if (depId.toString() === taskId.toString()) {
      return true;
    }

    // BFS to find cycles
    const visited = new Set([taskId.toString(), depId.toString()]);
    const queue = [depId];

    while (queue.length > 0) {
      const current = queue.shift();
      const currentTask = await Task.findById(current).lean();
      if (!currentTask) continue;

      for (const nextDep of currentTask.dependsOn || []) {
        const nextId = nextDep.toString();
        if (nextId === taskId.toString()) return true;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push(nextDep);
        }
      }
    }
  }
  return false;
};

const buildFilter = (query, user, projectId = null) => {
  const filter = {};

  if (projectId) filter.project = projectId;
  if (query.status) filter.status = query.status;
  if (query.assignee) filter.assignee = query.assignee;
  if (query.priority) filter.priority = query.priority;

  // Employee: only see assigned tasks
  const roleName = user.role?.name;
  if (roleName === 'employee') {
    filter.assignee = user._id;
  }

  return filter;
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new task.
 */
export const createTask = async (projectId, data, user) => {
  // Validate project exists
  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Validate assignee
  if (data.assignee) {
    const assignee = await User.findById(data.assignee);
    if (!assignee) {
      throw new AppError('Assignee not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!assignee.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  // Validate dependencies exist and belong to the same project
  if (data.dependsOn && data.dependsOn.length > 0) {
    const deps = await Task.find({ _id: { $in: data.dependsOn }, project: projectId });
    if (deps.length !== data.dependsOn.length) {
      throw new AppError('One or more dependency tasks are invalid or belong to another project', 400, 'INVALID_DEPENDENCY');
    }

    // Check circular dependencies
    const hasCycle = await detectCircularDependency(null, data.dependsOn);
    if (hasCycle) {
      throw new AppError('Circular dependency detected', 400, 'CIRCULAR_DEPENDENCY');
    }
  }

  const task = await Task.create({
    ...data,
    project: projectId,
    createdBy: user._id,
  });

  logger.info(`Task created: ${task.title} in project ${project.name} by ${user.email}`);
  return task;
};

/**
 * List tasks with filters and pagination.
 */
export const getTasks = async (query, user, projectId = null) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user, projectId);

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .lean(),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single task by ID.
 */
export const getTaskById = async (id, user) => {
  const task = await Task.findById(id)
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name status')
    .populate('dependsOn', 'title status')
    .lean();

  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  return task;
};

/**
 * Update a task.
 */
export const updateTask = async (id, updates, user) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  await assertTaskProjectAccess(task, user);

  // Prevent changing critical fields
  delete updates.project;
  delete updates.createdBy;
  delete updates.status;
  delete updates.completedAt;
  delete updates.dependsOn;

  if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

  Object.assign(task, updates);
  await task.save();

  logger.info(`Task updated: ${task.title} by ${user.email}`);
  return task;
};

/**
 * Delete a task (admin/management/pm only).
 */
export const deleteTask = async (id, user) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  await assertTaskProjectAccess(task, user);

  // Only admin, management, or project manager can delete
  const roleName = user.role?.name;
  if (!PRIVILEGED_ROLES.includes(roleName) && roleName !== 'project_manager') {
    throw new AppError('Only admin, management, or project managers can delete tasks', 403, 'TASK_ACCESS_DENIED');
  }

  await Task.findByIdAndDelete(id);
  logger.info(`Task deleted: ${task.title} by ${user.email}`);
};

// ─── Business Actions ────────────────────────────────────────────────────────

/**
 * Change task status with transition validation.
 */
export const changeStatus = async (id, newStatus, user) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  await assertTaskProjectAccess(task, user);

  if (!Task.isValidTransition(task.status, newStatus)) {
    throw new AppError(
      `Cannot transition from "${task.status}" to "${newStatus}"`,
      400,
      'INVALID_TASK_STATUS_TRANSITION',
      { currentStatus: task.status, requestedStatus: newStatus },
    );
  }

  // Check dependencies are complete when marking as done
  if (newStatus === 'done' && task.dependsOn && task.dependsOn.length > 0) {
    const incompleteDeps = await Task.find({
      _id: { $in: task.dependsOn },
      status: { $ne: 'done' },
    });

    if (incompleteDeps.length > 0) {
      throw new AppError(
        'Cannot complete task: dependency tasks are not yet done',
        400,
        'DEPENDENCIES_INCOMPLETE',
        {
          incompleteDependencies: incompleteDeps.map((d) => ({
            id: d._id,
            title: d.title,
            status: d.status,
          })),
        },
      );
    }
  }

  const previousStatus = task.status;
  task.status = newStatus;

  if (newStatus === 'done') {
    task.completedAt = new Date();
  } else {
    task.completedAt = null;
  }

  await task.save();

  logger.info(`Task status: ${task.title} ${previousStatus} → ${newStatus} by ${user.email}`);
  return { task, previousStatus };
};

/**
 * Assign a task to a user.
 */
export const assignTask = async (id, assigneeId, user) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  }

  await assertTaskProjectAccess(task, user);

  if (assigneeId) {
    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      throw new AppError('User not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!assignee.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  task.assignee = assigneeId;
  await task.save();

  logger.info(`Task assigned: ${task.title} → ${assigneeId || 'unassigned'} by ${user.email}`);
  return task;
};

export default {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  changeStatus,
  assignTask,
};
