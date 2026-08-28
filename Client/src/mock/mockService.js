/**
 * Mock Service Layer for stateful offline / fallback interactions
 */
import {
  MOCK_USERS,
  MOCK_LEADS,
  MOCK_CLIENTS,
  MOCK_OPPORTUNITIES,
  MOCK_QUOTATIONS,
  MOCK_PROJECTS,
  MOCK_TASKS,
  MOCK_INVOICES,
  MOCK_PAYMENTS,
  MOCK_ACTIVITIES,
  MOCK_NOTIFICATIONS,
} from './mockData';

// Initialize in-memory storage from localStorage or seed
const getStored = (key, fallback) => {
  try {
    const item = localStorage.getItem(`crm_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setStored = (key, value) => {
  try {
    localStorage.setItem(`crm_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(e);
  }
};

class MockService {
  constructor() {
    this.leads = getStored('leads', MOCK_LEADS);
    this.clients = getStored('clients', MOCK_CLIENTS);
    this.opportunities = getStored('opportunities', MOCK_OPPORTUNITIES);
    this.quotations = getStored('quotations', MOCK_QUOTATIONS);
    this.projects = getStored('projects', MOCK_PROJECTS);
    this.tasks = getStored('tasks', MOCK_TASKS);
    this.invoices = getStored('invoices', MOCK_INVOICES);
    this.payments = getStored('payments', MOCK_PAYMENTS);
    this.activities = getStored('activities', MOCK_ACTIVITIES);
    this.notifications = getStored('notifications', MOCK_NOTIFICATIONS);
    this.users = MOCK_USERS;
  }

  saveState() {
    setStored('leads', this.leads);
    setStored('clients', this.clients);
    setStored('opportunities', this.opportunities);
    setStored('quotations', this.quotations);
    setStored('projects', this.projects);
    setStored('tasks', this.tasks);
    setStored('invoices', this.invoices);
    setStored('payments', this.payments);
    setStored('activities', this.activities);
    setStored('notifications', this.notifications);
  }

  async delay(ms = 300) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- LEADS ---
  async getLeads() {
    await this.delay();
    return [...this.leads];
  }

  async getLeadById(id) {
    await this.delay();
    return this.leads.find((l) => l.id === id);
  }

  async createLead(data) {
    await this.delay();
    const newLead = {
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'new',
      ownerId: 'usr-3',
      ownerName: 'Marcus Sterling',
      ...data,
    };
    this.leads.unshift(newLead);
    this.addActivity({
      entityType: 'Lead',
      entityId: newLead.id,
      type: 'lead_created',
      title: `Lead created: ${newLead.company}`,
      description: `New lead added by Marcus Sterling`,
      performedBy: 'Marcus Sterling',
    });
    this.saveState();
    return newLead;
  }

  async updateLead(id, data) {
    await this.delay();
    const index = this.leads.findIndex((l) => l.id === id);
    if (index !== -1) {
      this.leads[index] = { ...this.leads[index], ...data };
      this.saveState();
      return this.leads[index];
    }
    throw new Error('Lead not found');
  }

  // --- OPPORTUNITIES ---
  async getOpportunities() {
    await this.delay();
    return [...this.opportunities];
  }

  async getOpportunityById(id) {
    await this.delay();
    return this.opportunities.find((o) => o.id === id);
  }

  async updateOpportunityStage(id, stage) {
    await this.delay();
    const opp = this.opportunities.find((o) => o.id === id);
    if (opp) {
      opp.stage = stage;
      this.saveState();
      return opp;
    }
    throw new Error('Opportunity not found');
  }

  /**
   * CRITICAL WORKFLOW: Mark Won
   * Creates downstream Project and Draft Invoice!
   */
  async markOpportunityWon(id, { acceptedQuotationId, notes } = {}) {
    await this.delay(600); // Simulate backend multi-step transaction
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) throw new Error('Opportunity not found');

    if (opp.stage === 'won') {
      throw new Error('This opportunity has already been marked as Won.');
    }

    // Find linked quotation
    const quotation = this.quotations.find((q) => q.id === (acceptedQuotationId || opp.acceptedQuotationId));
    
    // Update opportunity state
    opp.stage = 'won';
    opp.probability = 100;
    opp.acceptedQuotationId = quotation ? quotation.id : null;

    // 1. Create Project
    const newProjectId = `proj-${Date.now()}`;
    const newProject = {
      id: newProjectId,
      code: `PRJ-${opp.clientName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`,
      name: opp.title,
      clientId: opp.clientId,
      clientName: opp.clientName,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      acceptedQuotationId: quotation ? quotation.id : null,
      quotationNumber: quotation ? quotation.quotationNumber : 'N/A',
      commercialValue: opp.value,
      status: 'planned',
      managerId: 'usr-4',
      managerName: 'Sarah Jenkins',
      team: [{ id: 'usr-4', name: 'Sarah Jenkins', role: 'Project Manager' }],
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      progress: 0,
      handoverReceipt: {
        sourceOpportunity: opp.title,
        acceptedQuotation: quotation ? quotation.quotationNumber : 'QT-DIRECT',
        client: opp.clientName,
        commercialValue: opp.value,
        transferredAt: new Date().toISOString(),
        notes: notes || 'Handover created automatically upon marking Opportunity as Won.',
      },
      createdAt: new Date().toISOString(),
    };
    this.projects.unshift(newProject);
    opp.projectId = newProjectId;

    // 2. Create Draft Invoice
    const subtotal = opp.value;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    const newInvoiceId = `inv-${Date.now()}`;
    const newInvoice = {
      id: newInvoiceId,
      invoiceNumber: `INV-2026-0${Math.floor(Math.random() * 900 + 100)}`,
      clientId: opp.clientId,
      clientName: opp.clientName,
      projectId: newProjectId,
      projectName: opp.title,
      quotationId: quotation ? quotation.id : null,
      quotationNumber: quotation ? quotation.quotationNumber : 'N/A',
      status: 'draft',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax,
      total,
      paidAmount: 0,
      balance: total,
      createdById: 'usr-6',
      createdByName: 'Rachel Green',
      createdAt: new Date().toISOString(),
      items: quotation ? quotation.items : [{ description: opp.title, quantity: 1, unitPrice: subtotal, total: subtotal }],
    };
    this.invoices.unshift(newInvoice);
    opp.invoiceId = newInvoiceId;

    // 3. Log Timeline Activity
    this.addActivity({
      entityType: 'Opportunity',
      entityId: opp.id,
      type: 'won',
      title: `Opportunity Won: ${opp.title}`,
      description: `Marked Won. Created Project ${newProject.code} and Draft Invoice ${newInvoice.invoiceNumber}.`,
      performedBy: 'Marcus Sterling',
    });

    // 4. Send Real-time Notification to PM & Finance
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      category: 'Handovers',
      title: 'New Project Handover Created',
      message: `${opp.title} (${opp.clientName}) has been handed over to Project Management.`,
      link: `/projects/${newProjectId}`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.saveState();

    return {
      opportunity: opp,
      project: newProject,
      invoice: newInvoice,
    };
  }

  async markOpportunityLost(id, reason) {
    await this.delay();
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) throw new Error('Opportunity not found');
    opp.stage = 'lost';
    opp.lossReason = reason;
    this.addActivity({
      entityType: 'Opportunity',
      entityId: id,
      type: 'lost',
      title: `Opportunity Lost: ${opp.title}`,
      description: `Reason: ${reason}`,
      performedBy: 'Marcus Sterling',
    });
    this.saveState();
    return opp;
  }

  // --- CLIENTS ---
  async getClients() {
    await this.delay();
    return [...this.clients];
  }

  async getClient360(id) {
    await this.delay();
    const client = this.clients.find((c) => c.id === id);
    if (!client) throw new Error('Client not found');

    const clientOpps = this.opportunities.filter((o) => o.clientId === id);
    const clientQuots = this.quotations.filter((q) => q.clientId === id);
    const clientProjs = this.projects.filter((p) => p.clientId === id);
    const clientInvs = this.invoices.filter((i) => i.clientId === id);
    const clientActs = this.activities.filter((a) => a.entityId === id || clientOpps.some(o => o.id === a.entityId));

    return {
      client,
      opportunities: clientOpps,
      quotations: clientQuots,
      projects: clientProjs,
      invoices: clientInvs,
      activities: clientActs,
    };
  }

  // --- QUOTATIONS ---
  async getQuotations() {
    await this.delay();
    return [...this.quotations];
  }

  async createQuotation(data) {
    await this.delay();
    const newQuotation = {
      id: `qt-${Date.now()}`,
      quotationNumber: `QT-2026-0${Math.floor(Math.random() * 900 + 100)}`,
      version: 1,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: 'usr-3',
      createdByName: 'Marcus Sterling',
      ...data,
    };
    this.quotations.unshift(newQuotation);
    this.saveState();
    return newQuotation;
  }

  async updateQuotationStatus(id, status) {
    await this.delay();
    const qt = this.quotations.find((q) => q.id === id);
    if (qt) {
      qt.status = status;
      this.saveState();
      return qt;
    }
    throw new Error('Quotation not found');
  }

  // --- PROJECTS & TASKS ---
  async getProjects() {
    await this.delay();
    return [...this.projects];
  }

  async getProjectById(id) {
    await this.delay();
    return this.projects.find((p) => p.id === id);
  }

  async getTasks() {
    await this.delay();
    return [...this.tasks];
  }

  async createTask(data) {
    await this.delay();
    const newTask = {
      id: `tsk-${Date.now()}`,
      status: 'todo',
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.tasks.unshift(newTask);
    this.saveState();
    return newTask;
  }

  async updateTaskStatus(id, status) {
    await this.delay();
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = status;
      this.saveState();
      return task;
    }
    throw new Error('Task not found');
  }

  // --- FINANCE & PAYMENTS ---
  async getInvoices() {
    await this.delay();
    return [...this.invoices];
  }

  async getInvoiceById(id) {
    await this.delay();
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    const payments = this.payments.filter((p) => p.invoiceId === id);
    return { ...inv, payments };
  }

  async recordPayment(invoiceId, { amount, paymentMethod, transactionRef, notes }) {
    await this.delay(500);
    const invoice = this.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than 0.');
    }

    if (paymentAmount > invoice.balance) {
      throw new Error(`Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed remaining balance (₹${invoice.balance.toLocaleString()}).`);
    }

    // Update financial calculations atomically
    invoice.paidAmount += paymentAmount;
    invoice.balance -= paymentAmount;
    invoice.status = invoice.balance === 0 ? 'paid' : 'partially_paid';

    const newPayment = {
      id: `pay-${Date.now()}`,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      amount: paymentAmount,
      paymentMethod,
      transactionRef,
      paidDate: new Date().toISOString(),
      notes,
      recordedBy: 'Rachel Green',
    };
    this.payments.unshift(newPayment);

    this.addActivity({
      entityType: 'Invoice',
      entityId: invoiceId,
      type: 'payment',
      title: `Payment Received: ${invoice.invoiceNumber}`,
      description: `Recorded ₹${paymentAmount.toLocaleString()} via ${paymentMethod} (Ref: ${transactionRef}). Remaining balance: ₹${invoice.balance.toLocaleString()}`,
      performedBy: 'Rachel Green',
    });

    this.saveState();

    return {
      invoice,
      payment: newPayment,
    };
  }

  // --- ACTIVITIES TIMELINE ---
  async getActivities(entityId = null) {
    await this.delay();
    if (entityId) {
      return this.activities.filter((a) => a.entityId === entityId);
    }
    return [...this.activities];
  }

  addActivity(data) {
    const newAct = {
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.activities.unshift(newAct);
    this.saveState();
    return newAct;
  }

  // --- NOTIFICATIONS ---
  async getNotifications() {
    await this.delay();
    return [...this.notifications];
  }

  async markNotificationRead(id) {
    await this.delay(100);
    const n = this.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.saveState();
    }
    return this.notifications;
  }

  async markAllNotificationsRead() {
    await this.delay(100);
    this.notifications.forEach((n) => (n.read = true));
    this.saveState();
    return this.notifications;
  }
}

export const mockService = new MockService();
