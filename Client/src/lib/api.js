/**
 * Centralized API Service Layer
 * Wraps apiClient with backend endpoint calls and normalizes responses
 * to match frontend component expectations.
 *
 * When backend is unreachable, apiClient interceptor falls back to mockService.
 */
import { apiClient } from './apiClient';

// ─── Normalization Helpers ───────────────────────────────────────────────────

/** Safely flatten a Mongoose-populated reference into { id, name, ... } */
const flattenRef = (ref, nameField = 'name') => {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) {
    return { id: ref._id, name: ref[nameField] || ref.companyName || ref.title || '' };
  }
  return { id: ref, name: '' };
};

const toDateStr = (d) => (d ? new Date(d).toISOString() : null);

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authApi = {
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    // res = { success, data: { user, accessToken } }
    const raw = res.data;
    return { user: normalizeUser(raw.user), accessToken: raw.accessToken };
  },

  async getMe() {
    const res = await apiClient.get('/auth/me');
    return normalizeUser(res.data);
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },

  async refresh() {
    const res = await apiClient.post('/auth/refresh');
    return res.data;
  },
};

function normalizeUser(u) {
  if (!u) return null;
  const roleName = typeof u.role === 'object' && u.role !== null
    ? u.role.name
    : (typeof u.role === 'string' ? u.role : 'employee');
  return {
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    role: roleName,
    title: u.title || roleName.replace(/_/g, ' '),
    avatar: u.avatar || null,
    phone: u.phone || null,
    isActive: u.isActive !== false,
  };
}

// ─── LEADS ───────────────────────────────────────────────────────────────────

function normalizeLead(l) {
  if (!l) return null;
  const assignedTo = flattenRef(l.assignedTo);
  const createdBy = flattenRef(l.createdBy);
  return {
    id: l._id || l.id,
    name: l.name || '',
    company: l.company || '',
    companyName: l.company || l.name || '',
    contactName: l.name || '',
    email: l.email || '',
    phone: l.phone || '',
    source: l.source || '',
    status: l.status || 'new',
    budget: l.budget || l.estimatedValue || 0,
    estimatedValue: l.budget || l.estimatedValue || 0,
    assignedTo: assignedTo?.id || null,
    assignedToName: assignedTo?.name || '',
    ownerId: createdBy?.id || assignedTo?.id || '',
    ownerName: createdBy?.name || assignedTo?.name || '',
    tags: l.tags || [],
    notes: l.notes || '',
    convertedToOpportunity: l.convertedToOpportunity || null,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export const leadsApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.source) qs.set('source', params.source);
    if (params.assignedTo) qs.set('assignedTo', params.assignedTo);
    if (params.sort) qs.set('sort', params.sort);

    const url = `/leads${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeLead),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id) {
    const res = await apiClient.get(`/leads/${id}`);
    return normalizeLead(res.data);
  },

  async create(data) {
    const res = await apiClient.post('/leads', {
      name: data.contactName || data.name,
      company: data.companyName || data.company,
      email: data.email,
      phone: data.phone,
      source: data.source,
      budget: data.estimatedValue || data.budget || 0,
      notes: data.notes,
      assignedTo: data.assignedTo,
      tags: data.tags || [],
    });
    return normalizeLead(res.data);
  },

  async update(id, data) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.company !== undefined) payload.company = data.company;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.source !== undefined) payload.source = data.source;
    if (data.status !== undefined) payload.status = data.status;
    if (data.budget !== undefined) payload.budget = data.budget;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.tags !== undefined) payload.tags = data.tags;
    if (data.assignedTo !== undefined) payload.assignedTo = data.assignedTo;
    const res = await apiClient.patch(`/leads/${id}`, payload);
    return normalizeLead(res.data);
  },

  async delete(id) {
    await apiClient.delete(`/leads/${id}`);
  },

  async assign(id, assignedTo) {
    const res = await apiClient.patch(`/leads/${id}/assign`, { assignedTo });
    return normalizeLead(res.data);
  },

  async changeStatus(id, status) {
    const res = await apiClient.patch(`/leads/${id}/status`, { status });
    return normalizeLead(res.data);
  },

  async qualify(id) {
    const res = await apiClient.patch(`/leads/${id}/qualify`);
    return normalizeLead(res.data);
  },

  async convert(id) {
    const res = await apiClient.patch(`/leads/${id}/convert`);
    return res.data;
  },

  async getActivities(id) {
    const res = await apiClient.get(`/leads/${id}/activities`);
    return (res.data || []).map(normalizeActivity);
  },
};

// ─── OPPORTUNITIES ───────────────────────────────────────────────────────────

function normalizeOpportunity(o) {
  if (!o) return null;
  const client = flattenRef(o.client, 'companyName');
  const assignedTo = flattenRef(o.assignedTo);
  const lead = flattenRef(o.lead);
  const project = flattenRef(o.project);
  return {
    id: o._id || o.id,
    title: o.title || '',
    clientId: client?.id || null,
    clientName: client?.name || '',
    stage: o.stage || 'prospecting',
    value: o.value || 0,
    currency: o.currency || 'INR',
    probability: o.probability || 0,
    expectedCloseDate: o.expectedCloseDate || null,
    assignedTo: assignedTo?.id || null,
    ownerName: assignedTo?.name || '',
    ownerId: assignedTo?.id || null,
    leadId: lead?.id || null,
    projectId: project?.id || o.project || null,
    lostReason: o.lostReason || null,
    wonAt: o.wonAt || null,
    acceptedQuotationId: o.acceptedQuotation || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export const opportunitiesApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.stage) qs.set('stage', params.stage);
    if (params.assignedTo) qs.set('assignedTo', params.assignedTo);
    if (params.sort) qs.set('sort', params.sort);

    const url = `/opportunities${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeOpportunity),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id) {
    const res = await apiClient.get(`/opportunities/${id}`);
    return normalizeOpportunity(res.data);
  },

  async create(data) {
    const res = await apiClient.post('/opportunities', {
      title: data.title,
      client: data.clientId,
      lead: data.leadId,
      value: data.value,
      currency: data.currency || 'INR',
      probability: data.probability || 30,
      expectedCloseDate: data.expectedCloseDate,
      assignedTo: data.assignedTo,
    });
    return normalizeOpportunity(res.data);
  },

  async update(id, data) {
    const payload = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.value !== undefined) payload.value = data.value;
    if (data.probability !== undefined) payload.probability = data.probability;
    if (data.expectedCloseDate !== undefined) payload.expectedCloseDate = data.expectedCloseDate;
    if (data.clientId !== undefined) payload.client = data.clientId;
    const res = await apiClient.patch(`/opportunities/${id}`, payload);
    return normalizeOpportunity(res.data);
  },

  async delete(id) {
    await apiClient.delete(`/opportunities/${id}`);
  },

  async changeStage(id, stage) {
    const res = await apiClient.patch(`/opportunities/${id}/stage`, { stage });
    return normalizeOpportunity(res.data);
  },

  async markWon(id, quotationId) {
    const res = await apiClient.patch(`/opportunities/${id}/won`, { quotationId: quotationId || undefined });
    return res.data;
  },

  async markLost(id, reason) {
    const res = await apiClient.patch(`/opportunities/${id}/lost`, { reason });
    return normalizeOpportunity(res.data);
  },

  async assign(id, assignedTo) {
    const res = await apiClient.patch(`/opportunities/${id}/assign`, { assignedTo });
    return normalizeOpportunity(res.data);
  },

  async getQuotations(id) {
    const res = await apiClient.get(`/opportunities/${id}/quotations`);
    return (res.data || []).map(normalizeQuotation);
  },
};

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

function normalizeClient(c) {
  if (!c) return null;
  const owner = flattenRef(c.accountOwner);
  return {
    id: c._id || c.id,
    name: c.companyName || c.name || '',
    companyName: c.companyName || c.name || '',
    primaryContact: c.primaryContact?.name || c.primaryContact || '',
    email: c.primaryContact?.email || c.email || '',
    phone: c.primaryContact?.phone || c.phone || '',
    address: c.billingAddress || c.address || '',
    industry: c.industry || '',
    website: c.website || '',
    status: c.status || 'active',
    accountOwnerId: owner?.id || null,
    accountManagerName: owner?.name || '',
    convertedFromLead: c.convertedFromLead || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const clientsApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.accountOwner) qs.set('accountOwner', params.accountOwner);

    const url = `/clients${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeClient),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id) {
    const res = await apiClient.get(`/clients/${id}`);
    return normalizeClient(res.data);
  },

  async get360(id) {
    const res = await apiClient.get(`/clients/${id}/360`);
    const raw = res.data;
    return {
      client: normalizeClient(raw.client || raw),
      opportunities: (raw.opportunities || []).map(normalizeOpportunity),
      quotations: (raw.quotations || []).map(normalizeQuotation),
      projects: (raw.projects || []).map(normalizeProject),
      invoices: (raw.invoices || []).map(normalizeInvoice),
      activities: (raw.activities || []).map(normalizeActivity),
    };
  },

  async create(data) {
    const res = await apiClient.post('/clients', {
      companyName: data.companyName || data.name,
      primaryContact: {
        name: data.primaryContact,
        email: data.email,
        phone: data.phone,
      },
      billingAddress: data.billingAddress || data.address,
      industry: data.industry,
      website: data.website,
      accountOwner: data.accountOwnerId || data.accountOwner,
    });
    return normalizeClient(res.data);
  },

  async update(id, data) {
    const payload = {};
    if (data.companyName !== undefined) payload.companyName = data.companyName;
    if (data.primaryContact !== undefined) payload.primaryContact = data.primaryContact;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.billingAddress !== undefined) payload.billingAddress = data.billingAddress;
    if (data.status !== undefined) payload.status = data.status;
    const res = await apiClient.patch(`/clients/${id}`, payload);
    return normalizeClient(res.data);
  },

  async delete(id) {
    await apiClient.delete(`/clients/${id}`);
  },
};

// ─── QUOTATIONS ──────────────────────────────────────────────────────────────

function normalizeQuotation(q) {
  if (!q) return null;
  const opp = flattenRef(q.opportunity);
  const client = flattenRef(q.client, 'companyName');
  const createdBy = flattenRef(q.createdBy);
  return {
    id: q._id || q.id,
    quotationNumber: q.quotationNumber || '',
    version: q.version || 1,
    opportunityId: opp?.id || null,
    opportunityTitle: opp?.name || '',
    clientId: client?.id || null,
    clientName: client?.name || '',
    status: q.status || 'draft',
    validUntil: q.validUntil || q.validityDate || null,
    validityDate: q.validUntil || q.validityDate || null,
    items: (q.items || []).map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent || 18,
      lineTotal: item.lineTotal || (item.quantity * item.unitPrice),
      total: item.lineTotal || item.total || (item.quantity * item.unitPrice),
    })),
    subtotal: q.subtotal || 0,
    tax: q.tax || 0,
    total: q.total || 0,
    currency: q.currency || 'INR',
    notes: q.notes || '',
    termsAndConditions: q.termsAndConditions || '',
    createdBy: createdBy?.id || null,
    createdByName: createdBy?.name || '',
    sentAt: q.sentAt || null,
    acceptedAt: q.acceptedAt || null,
    rejectedAt: q.rejectedAt || null,
    rejectionReason: q.rejectionReason || null,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

export const quotationsApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.opportunity) qs.set('opportunity', params.opportunity);
    if (params.client) qs.set('client', params.client);

    const url = `/quotations${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeQuotation),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id) {
    const res = await apiClient.get(`/quotations/${id}`);
    return normalizeQuotation(res.data);
  },

  async create(data) {
    const res = await apiClient.post('/quotations', {
      opportunity: data.opportunityId,
      client: data.clientId,
      currency: data.currency || 'INR',
      items: (data.items || []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent || 18,
      })),
      validUntil: data.validUntil || data.validityDate,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
    });
    return normalizeQuotation(res.data);
  },

  async update(id, data) {
    const payload = {};
    if (data.items !== undefined) {
      payload.items = data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent || 18,
      }));
    }
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.validUntil !== undefined) payload.validUntil = data.validUntil;
    const res = await apiClient.patch(`/quotations/${id}`, payload);
    return normalizeQuotation(res.data);
  },

  async delete(id) {
    await apiClient.delete(`/quotations/${id}`);
  },

  async send(id) {
    const res = await apiClient.patch(`/quotations/${id}/send`);
    return normalizeQuotation(res.data);
  },

  async accept(id) {
    const res = await apiClient.patch(`/quotations/${id}/accept`);
    return normalizeQuotation(res.data);
  },

  async reject(id, reason) {
    const res = await apiClient.patch(`/quotations/${id}/reject`, { reason });
    return normalizeQuotation(res.data);
  },

  async getByOpportunity(oppId) {
    const res = await apiClient.get(`/opportunities/${oppId}/quotations`);
    return (res.data || []).map(normalizeQuotation);
  },
};

// ─── PROJECTS ────────────────────────────────────────────────────────────────

function normalizeProject(p) {
  if (!p) return null;
  const client = flattenRef(p.client, 'companyName');
  const manager = flattenRef(p.manager);
  const opp = flattenRef(p.sourceOpportunity);
  const qt = flattenRef(p.sourceQuotation);
  const team = (p.team || []).map((t) => {
    if (typeof t === 'object' && t.user) {
      const u = flattenRef(t.user);
      return { id: u?.id || t.user, name: u?.name || '', role: t.role || 'Member' };
    }
    if (typeof t === 'object' && t._id) {
      return { id: t._id, name: t.name || '', role: t.role || 'Member' };
    }
    return { id: t, name: '', role: 'Member' };
  });

  return {
    id: p._id || p.id,
    name: p.name || '',
    code: p.code || `PRJ-${(p.name || '').substring(0, 3).toUpperCase()}`,
    clientId: client?.id || null,
    clientName: client?.name || '',
    opportunityId: opp?.id || null,
    opportunityTitle: opp?.name || p.sourceOpportunity?.title || '',
    acceptedQuotationId: qt?.id || null,
    quotationNumber: qt?.name || p.sourceQuotation?.quotationNumber || '',
    commercialValue: p.budget || p.commercialValue || 0,
    budget: p.budget || p.commercialValue || 0,
    status: p.status || 'planned',
    managerId: manager?.id || null,
    managerName: manager?.name || '',
    team,
    startDate: p.startDate || null,
    dueDate: p.endDate || p.dueDate || null,
    progress: p.progress || 0,
    handoverReceipt: p.handoverReceipt || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const projectsApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.manager) qs.set('manager', params.manager);

    const url = `/projects${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeProject),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id) {
    const res = await apiClient.get(`/projects/${id}`);
    return normalizeProject(res.data);
  },

  async create(data) {
    const res = await apiClient.post('/projects', {
      name: data.name,
      client: data.clientId,
      sourceOpportunity: data.opportunityId,
      sourceQuotation: data.quotationId,
      manager: data.managerId,
      budget: data.budget || data.commercialValue,
      startDate: data.startDate,
      endDate: data.dueDate || data.endDate,
    });
    return normalizeProject(res.data);
  },

  async update(id, data) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.budget !== undefined) payload.budget = data.budget;
    if (data.startDate !== undefined) payload.startDate = data.startDate;
    if (data.endDate !== undefined) payload.endDate = data.endDate;
    const res = await apiClient.patch(`/projects/${id}`, payload);
    return normalizeProject(res.data);
  },

  async delete(id) {
    await apiClient.delete(`/projects/${id}`);
  },

  async changeStatus(id, status) {
    const res = await apiClient.patch(`/projects/${id}/status`, { status });
    return normalizeProject(res.data);
  },

  async assignManager(id, managerId) {
    const res = await apiClient.patch(`/projects/${id}/manager`, { manager: managerId });
    return normalizeProject(res.data);
  },

  async assignTeam(id, team) {
    const res = await apiClient.patch(`/projects/${id}/team`, { team });
    return normalizeProject(res.data);
  },

  async getTasks(projectId) {
    const res = await apiClient.get(`/tasks/project/${projectId}`);
    return {
      data: (res.data || []).map(normalizeTask),
      meta: res.meta || {},
    };
  },

  async getActivities(projectId) {
    const res = await apiClient.get(`/projects/${projectId}/activities`);
    return (res.data || []).map(normalizeActivity);
  },
};

// ─── TASKS ───────────────────────────────────────────────────────────────────

function normalizeTask(t) {
  if (!t) return null;
  const project = flattenRef(t.project);
  const assignee = flattenRef(t.assignee);
  const createdBy = flattenRef(t.createdBy);
  return {
    id: t._id || t.id,
    title: t.title || '',
    description: t.description || '',
    projectId: project?.id || null,
    projectName: project?.name || '',
    status: t.status || 'todo',
    priority: t.priority || 'medium',
    assigneeId: assignee?.id || null,
    assigneeName: assignee?.name || '',
    dueDate: t.dueDate || null,
    createdBy: createdBy?.id || null,
    dependsOn: t.dependsOn || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export const tasksApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.projectId) qs.set('project', params.projectId);
    if (params.status) qs.set('status', params.status);
    if (params.assignee) qs.set('assignee', params.assignee);

    const url = `/tasks${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeTask),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getByProject(projectId) {
    const res = await apiClient.get(`/tasks/project/${projectId}`);
    return {
      data: (res.data || []).map(normalizeTask),
      meta: res.meta || {},
    };
  },

  async getById(id) {
    const res = await apiClient.get(`/tasks/${id}`);
    return normalizeTask(res.data);
  },

  async create(projectId, data) {
    const url = projectId ? `/tasks/project/${projectId}` : '/tasks';
    const res = await apiClient.post(url, {
      title: data.title,
      description: data.description,
      project: data.projectId || projectId,
      assignee: data.assigneeId,
      priority: data.priority,
      dueDate: data.dueDate,
    });
    return normalizeTask(res.data);
  },

  async update(id, data) {
    const payload = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
    const res = await apiClient.patch(`/tasks/${id}`, payload);
    return normalizeTask(res.data);
  },

  async delete(id) {
    await apiClient.delete(`/tasks/${id}`);
  },

  async changeStatus(id, status) {
    const res = await apiClient.patch(`/tasks/${id}/status`, { status });
    return normalizeTask(res.data);
  },

  async assign(id, assigneeId) {
    const res = await apiClient.patch(`/tasks/${id}/assign`, { assignee: assigneeId });
    return normalizeTask(res.data);
  },
};

// ─── FINANCE (INVOICES + PAYMENTS) ───────────────────────────────────────────

function normalizeInvoice(inv) {
  if (!inv) return null;
  const client = flattenRef(inv.client, 'companyName');
  const project = flattenRef(inv.project);
  const opp = flattenRef(inv.opportunity);
  const qt = flattenRef(inv.quotation);
  const createdBy = flattenRef(inv.createdBy);
  return {
    id: inv._id || inv.id,
    invoiceNumber: inv.invoiceNumber || '',
    clientId: client?.id || null,
    clientName: client?.name || '',
    projectId: project?.id || null,
    projectName: project?.name || '',
    opportunityId: opp?.id || null,
    quotationId: qt?.id || null,
    quotationNumber: qt?.name || '',
    status: inv.status || 'draft',
    dueDate: inv.dueDate || null,
    issueDate: inv.issuedAt || inv.issueDate || inv.createdAt,
    paidAt: inv.paidAt || null,
    items: (inv.items || []).map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.taxPercent || 0,
      lineTotal: item.lineTotal || (item.quantity * item.unitPrice),
      total: item.lineTotal || item.total || (item.quantity * item.unitPrice),
    })),
    subtotal: inv.subtotal || 0,
    tax: inv.tax || 0,
    total: inv.total || inv.amountDue || 0,
    amountDue: inv.amountDue || inv.total || 0,
    paidAmount: inv.amountPaid || inv.paidAmount || 0,
    balance: inv.balance != null ? inv.balance : ((inv.total || inv.amountDue || 0) - (inv.amountPaid || inv.paidAmount || 0)),
    currency: inv.currency || 'INR',
    createdBy: createdBy?.id || null,
    createdByName: createdBy?.name || '',
    payments: (inv.payments || []).map(normalizePayment),
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}

function normalizePayment(p) {
  if (!p) return null;
  const invoice = flattenRef(p.invoice);
  const recordedBy = flattenRef(p.recordedBy);
  return {
    id: p._id || p.id,
    invoiceId: invoice?.id || p.invoice || null,
    invoiceNumber: invoice?.name || '',
    amount: p.amount || 0,
    paymentMethod: p.method || p.paymentMethod || '',
    transactionRef: p.transactionRef || '',
    paidAt: p.paidAt || p.createdAt,
    paidDate: p.paidAt || p.createdAt,
    notes: p.notes || '',
    recordedBy: recordedBy?.name || '',
    createdAt: p.createdAt,
  };
}

export const financeApi = {
  async listInvoices(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    if (params.status) qs.set('status', params.status);
    if (params.client) qs.set('client', params.client);
    if (params.project) qs.set('project', params.project);

    const url = `/invoices${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    return {
      data: (res.data || []).map(normalizeInvoice),
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getInvoiceById(id) {
    const res = await apiClient.get(`/invoices/${id}`);
    const inv = normalizeInvoice(res.data);
    // Also fetch payments
    try {
      const payRes = await apiClient.get(`/invoices/${id}/payments`);
      inv.payments = (payRes.data || []).map(normalizePayment);
    } catch {
      // payments might not exist yet
    }
    return inv;
  },

  async createInvoice(data) {
    const res = await apiClient.post('/invoices', {
      client: data.clientId,
      project: data.projectId,
      opportunity: data.opportunityId,
      quotation: data.quotationId,
      items: (data.items || []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent || 18,
      })),
      dueDate: data.dueDate,
      currency: data.currency || 'INR',
    });
    return normalizeInvoice(res.data);
  },

  async sendInvoice(id) {
    const res = await apiClient.patch(`/invoices/${id}/send`);
    return normalizeInvoice(res.data);
  },

  async approveInvoice(id) {
    const res = await apiClient.patch(`/invoices/${id}/approve`);
    return normalizeInvoice(res.data);
  },

  async cancelInvoice(id) {
    const res = await apiClient.patch(`/invoices/${id}/cancel`);
    return normalizeInvoice(res.data);
  },

  async recordPayment(invoiceId, data) {
    const res = await apiClient.post(`/invoices/${invoiceId}/payments`, {
      amount: data.amount,
      method: data.paymentMethod || data.method,
      transactionRef: data.transactionRef,
      notes: data.notes,
    });
    return {
      invoice: normalizeInvoice(res.data?.invoice || res.data),
      payment: normalizePayment(res.data?.payment),
    };
  },

  async getPayments(invoiceId) {
    const res = await apiClient.get(`/invoices/${invoiceId}/payments`);
    return (res.data || []).map(normalizePayment);
  },
};

// ─── ACTIVITIES ──────────────────────────────────────────────────────────────

function normalizeActivity(a) {
  if (!a) return null;
  const owner = flattenRef(a.owner);
  return {
    id: a._id || a.id,
    type: a.type || 'note',
    entityType: a.relatedTo?.type || a.entityType || '',
    entityId: a.relatedTo?.id || a.entityId || '',
    title: a.title || a.description || '',
    description: a.description || '',
    dueDate: a.dueDate || null,
    completedAt: a.completedAt || null,
    ownerName: owner?.name || '',
    performedBy: owner?.name || a.performedBy || '',
    createdAt: a.createdAt,
  };
}

export const activitiesApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.relatedToType) qs.set('relatedToType', params.relatedToType);
    if (params.relatedToId) qs.set('relatedToId', params.relatedToId);
    if (params.cursor) qs.set('before', params.cursor);
    if (params.limit) qs.set('limit', params.limit);

    const url = `/activities${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    const data = Array.isArray(res.data) ? res.data : (res.data?.activities || []);
    return {
      data: data.map(normalizeActivity),
      meta: res.meta || {},
    };
  },

  async create(data) {
    const res = await apiClient.post('/activities', {
      type: data.type,
      relatedTo: { type: data.entityType || data.relatedToType, id: data.entityId || data.relatedToId },
      description: data.description || data.title,
      title: data.title,
      dueDate: data.dueDate,
    });
    return normalizeActivity(res.data);
  },

  async complete(id) {
    const res = await apiClient.patch(`/activities/${id}/complete`);
    return normalizeActivity(res.data);
  },
};

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

function normalizeNotification(n) {
  if (!n) return null;
  return {
    id: n._id || n.id,
    type: n.type || 'info',
    title: n.title || '',
    message: n.message || '',
    resourceType: n.resourceType || n.category || '',
    resourceId: n.resourceId || null,
    link: n.link || (n.resourceType && n.resourceId ? `/${n.resourceType.toLowerCase()}s/${n.resourceId}` : ''),
    read: n.isRead || n.read || false,
    readAt: n.readAt || null,
    createdAt: n.createdAt,
  };
}

export const notificationsApi = {
  async list(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);

    const url = `/notifications${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await apiClient.get(url);
    const data = Array.isArray(res.data) ? res.data : [];
    return {
      data: data.map(normalizeNotification),
      meta: res.meta || {},
    };
  },

  async getUnreadCount() {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data?.count || 0;
  },

  async markRead(id) {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return normalizeNotification(res.data);
  },

  async markAllRead() {
    const res = await apiClient.patch('/notifications/read-all');
    return res.data;
  },
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const reportsApi = {
  async salesPipeline() {
    const res = await apiClient.get('/reports/sales-pipeline');
    return res.data || {};
  },

  async financeOverview() {
    const res = await apiClient.get('/reports/finance-overview');
    return res.data || {};
  },

  async projectStatus() {
    const res = await apiClient.get('/reports/project-status');
    return res.data || {};
  },
};
