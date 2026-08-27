import Client from './client.model.js';
import Opportunity from '../pipeline/opportunity.model.js';
import Activity from '../activities/activity.model.js';
import User from '../users/user.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const assertClientAccess = (client, user) => {
  const isOwner = client.accountOwner?.toString() === user._id?.toString();
  const isCreator = client.createdBy?.toString() === user._id?.toString();
  const isPrivileged = assertOwnershipOrPrivileged(null, user, PRIVILEGED_ROLES);

  if (!isOwner && !isCreator && !isPrivileged) {
    throw new AppError('You do not have access to this client', 403, 'CLIENT_ACCESS_DENIED');
  }
};

const buildFilter = (query, user) => {
  const filter = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.accountOwner) {
    filter.accountOwner = query.accountOwner;
  }

  // Ownership visibility: sales users only see their own clients
  const roleName = user.role?.name;
  if (roleName === 'sales') {
    filter.$or = [
      { accountOwner: user._id },
      { createdBy: user._id },
    ];
  }

  return filter;
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new client.
 * Includes duplicate protection on companyName (case-insensitive).
 */
export const createClient = async (data, user) => {
  // Validate account owner
  if (data.accountOwner) {
    const owner = await User.findById(data.accountOwner);
    if (!owner) {
      throw new AppError('Account owner not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!owner.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  // Duplicate protection: check for existing client with same company name
  const existingClient = await Client.findOne({
    companyName: { $regex: new RegExp(`^${data.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });

  if (existingClient) {
    throw new AppError(
      `A client with the name "${existingClient.companyName}" already exists`,
      409,
      'DUPLICATE_CLIENT',
      { existingClientId: existingClient._id },
    );
  }

  const client = await Client.create({
    ...data,
    createdBy: user._id,
  });

  logger.info(`Client created: ${client.companyName} by ${user.email}`);
  return client;
};

/**
 * List clients with search, filters, and pagination.
 */
export const getClients = async (query, user) => {
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

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('accountOwner', 'name email')
      .populate('createdBy', 'name email')
      .lean(),
    Client.countDocuments(filter),
  ]);

  return {
    clients,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single client by ID.
 */
export const getClientById = async (id, user) => {
  const client = await Client.findById(id)
    .populate('accountOwner', 'name email')
    .populate('createdBy', 'name email')
    .populate('convertedFromLead', 'name company')
    .lean();

  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  return client;
};

/**
 * Update a client.
 */
export const updateClient = async (id, updates, user) => {
  const client = await Client.findById(id);
  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  assertClientAccess(client, user);

  // Prevent changing createdBy or convertedFromLead
  delete updates.createdBy;
  delete updates.convertedFromLead;

  // Check for duplicate company name if changing
  if (updates.companyName) {
    const existing = await Client.findOne({
      _id: { $ne: id },
      companyName: { $regex: new RegExp(`^${updates.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
      throw new AppError(
        `A client with the name "${existing.companyName}" already exists`,
        409,
        'DUPLICATE_CLIENT',
      );
    }
  }

  Object.assign(client, updates);
  await client.save();

  logger.info(`Client updated: ${client.companyName} by ${user.email}`);
  return client;
};

/**
 * Delete a client (admin/management only).
 */
export const deleteClient = async (id, user) => {
  const client = await Client.findById(id);
  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  const roleName = user.role?.name;
  if (!PRIVILEGED_ROLES.includes(roleName)) {
    throw new AppError('Only admin or management can delete clients', 403, 'CLIENT_ACCESS_DENIED');
  }

  await Client.findByIdAndDelete(id);
  logger.info(`Client deleted: ${client.companyName} by ${user.email}`);
};

// ─── Client 360 ─────────────────────────────────────────────────────────────

/**
 * Get Client 360 view — aggregated client info with related data.
 * Efficient: queries only what's needed, no massive nested populates.
 */
export const getClient360 = async (id, user) => {
  const client = await Client.findById(id)
    .populate('accountOwner', 'name email')
    .populate('createdBy', 'name email')
    .lean();

  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // Get related opportunities (summary only)
  const opportunities = await Opportunity.find({ client: id })
    .select('title stage value currency probability expectedCloseDate assignedTo createdAt')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Get recent activities (limited, use timeline endpoint for full history)
  const activities = await Activity.find({ 'relatedTo.type': 'Client', 'relatedTo.id': id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('owner', 'name email')
    .lean();

  return {
    client,
    opportunities,
    recentActivities: activities,
    stats: {
      totalOpportunities: opportunities.length,
      activeOpportunities: opportunities.filter((o) => !['won', 'lost'].includes(o.stage)).length,
      wonOpportunities: opportunities.filter((o) => o.stage === 'won').length,
      totalValue: opportunities.reduce((sum, o) => sum + (o.value || 0), 0),
    },
  };
};

export default {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClient360,
};
