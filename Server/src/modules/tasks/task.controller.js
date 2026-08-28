import * as taskService from './task.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const createTask = async (req, res) => {
  const task = await taskService.createTask(req.params.projectId, req.body, req.user);
  return sendSuccess(res, { data: task, statusCode: 201 });
};

export const getTasks = async (req, res) => {
  const projectId = req.params.projectId || null;
  const result = await taskService.getTasks(
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
    projectId,
  );
  return sendSuccess(res, { data: result.tasks, meta: result.meta });
};

export const getTaskById = async (req, res) => {
  const task = await taskService.getTaskById(req.params.id, req.user);
  return sendSuccess(res, { data: task });
};

export const updateTask = async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user);
  return sendSuccess(res, { data: task });
};

export const deleteTask = async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user);
  return sendSuccess(res, { data: { message: 'Task deleted successfully' } });
};

export const changeStatus = async (req, res) => {
  const result = await taskService.changeStatus(req.params.id, req.body.status, req.user);
  return sendSuccess(res, { data: result });
};

export const assignTask = async (req, res) => {
  const task = await taskService.assignTask(req.params.id, req.body.assignee, req.user);
  return sendSuccess(res, { data: task });
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
