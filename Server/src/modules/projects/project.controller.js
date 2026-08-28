import * as projectService from './project.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const createProject = async (req, res) => {
  const project = await projectService.createProject(req.body, req.user);
  return sendSuccess(res, { data: project, statusCode: 201 });
};

export const getProjects = async (req, res) => {
  const result = await projectService.getProjects(
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
  );
  return sendSuccess(res, { data: result.projects, meta: result.meta });
};

export const getProjectById = async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user);
  return sendSuccess(res, { data: project });
};

export const updateProject = async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body, req.user);
  return sendSuccess(res, { data: project });
};

export const deleteProject = async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user);
  return sendSuccess(res, { data: { message: 'Project deleted successfully' } });
};

export const changeStatus = async (req, res) => {
  const result = await projectService.changeStatus(req.params.id, req.body.status, req.user);
  return sendSuccess(res, { data: result });
};

export const assignManager = async (req, res) => {
  const project = await projectService.assignManager(req.params.id, req.body.manager, req.user);
  return sendSuccess(res, { data: project });
};

export const assignTeam = async (req, res) => {
  const project = await projectService.assignTeam(req.params.id, req.body.team, req.user);
  return sendSuccess(res, { data: project });
};

export const getProjectTasks = async (req, res) => {
  const result = await projectService.getProjectTasks(
    req.params.id,
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
  );
  return sendSuccess(res, { data: result.tasks, meta: result.meta });
};

export const getProjectActivities = async (req, res) => {
  const activities = await projectService.getProjectActivities(req.params.id, req.user);
  return sendSuccess(res, { data: activities });
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
};
