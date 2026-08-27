import * as clientService from './client.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const createClient = async (req, res) => {
  const client = await clientService.createClient(req.body, req.user);
  return sendSuccess(res, { data: client, statusCode: 201 });
};

export const getClients = async (req, res) => {
  const result = await clientService.getClients(
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
  );
  return sendSuccess(res, { data: result.clients, meta: result.meta });
};

export const getClientById = async (req, res) => {
  const client = await clientService.getClientById(req.params.id, req.user);
  return sendSuccess(res, { data: client });
};

export const updateClient = async (req, res) => {
  const client = await clientService.updateClient(req.params.id, req.body, req.user);
  return sendSuccess(res, { data: client });
};

export const deleteClient = async (req, res) => {
  await clientService.deleteClient(req.params.id, req.user);
  return sendSuccess(res, { data: { message: 'Client deleted successfully' } });
};

export const getClient360 = async (req, res) => {
  const result = await clientService.getClient360(req.params.id, req.user);
  return sendSuccess(res, { data: result });
};

export default {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClient360,
};
