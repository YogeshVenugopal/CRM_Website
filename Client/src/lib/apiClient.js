import axios from 'axios';
import { mockService } from '../mock/mockService';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for mock fallback if network request fails / server is down
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // If backend server is not running (ERR_CONNECTION_REFUSED or 404 in mock environment), fallback to mockService gracefully
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';

    const enableMockFallback = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

    if (isNetworkError && enableMockFallback) {
      console.warn('[API Client] Backend API unreachable. Falling back to Mock Engine.', error.config?.url);
      return handleMockFallback(error.config);
    }

    // Format human-friendly actionable messages
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    let userMessage = 'An unexpected error occurred. Please try again.';

    if (status === 401) {
      userMessage = 'Session expired or invalid credentials. Please log in again.';
    } else if (status === 403) {
      userMessage = "You don't have permission to perform this action.";
    } else if (status === 404) {
      userMessage = 'The requested record or resource could not be found.';
    } else if (status === 409) {
      userMessage = serverMessage || 'Conflict encountered with existing records.';
    } else if (status === 422) {
      userMessage = serverMessage || "Couldn't save — check the highlighted fields.";
    } else if (status >= 500) {
      userMessage = 'Server error occurred. Please try again in a few moments.';
    }

    const enhancedError = new Error(userMessage);
    enhancedError.status = status;
    enhancedError.originalError = error;
    return Promise.reject(enhancedError);
  }
);

/**
 * Routes mock requests when backend isn't available
 */
async function handleMockFallback(config) {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  try {
    if (url.includes('/auth/me')) {
      const user = JSON.parse(localStorage.getItem('crm_current_user')) || mockService.users[0];
      return { success: true, data: user };
    }
    if (url.includes('/auth/login')) {
      const body = JSON.parse(config.data || '{}');
      const found = mockService.users.find(u => u.email === body.email) || mockService.users[0];
      localStorage.setItem('crm_current_user', JSON.stringify(found));
      return { success: true, data: found };
    }
    if (url.includes('/auth/logout')) {
      localStorage.removeItem('crm_current_user');
      return { success: true, message: 'Logged out successfully' };
    }

    // Leads
    if (url.includes('/leads')) {
      if (method === 'get') {
        const id = url.split('/leads/')[1];
        if (id) {
          const lead = await mockService.getLeadById(id);
          return { success: true, data: lead };
        }
        const leads = await mockService.getLeads();
        return { success: true, data: leads };
      }
      if (method === 'post') {
        const data = JSON.parse(config.data || '{}');
        const newLead = await mockService.createLead(data);
        return { success: true, data: newLead };
      }
    }

    // Opportunities
    if (url.includes('/opportunities')) {
      if (url.includes('/won')) {
        const id = url.split('/opportunities/')[1]?.split('/won')[0];
        const body = JSON.parse(config.data || '{}');
        const res = await mockService.markOpportunityWon(id, body);
        return { success: true, data: res };
      }
      if (url.includes('/lost')) {
        const id = url.split('/opportunities/')[1]?.split('/lost')[0];
        const body = JSON.parse(config.data || '{}');
        const opp = await mockService.markOpportunityLost(id, body.reason);
        return { success: true, data: opp };
      }
      if (method === 'get') {
        const opps = await mockService.getOpportunities();
        return { success: true, data: opps };
      }
    }

    // Clients 360
    if (url.includes('/clients')) {
      if (url.includes('/360')) {
        const id = url.split('/clients/')[1]?.split('/360')[0];
        const res = await mockService.getClient360(id);
        return { success: true, data: res };
      }
      if (method === 'get') {
        const clients = await mockService.getClients();
        return { success: true, data: clients };
      }
    }

    // Quotations
    if (url.includes('/quotations')) {
      if (method === 'get') {
        const qts = await mockService.getQuotations();
        return { success: true, data: qts };
      }
      if (method === 'post') {
        const body = JSON.parse(config.data || '{}');
        const newQt = await mockService.createQuotation(body);
        return { success: true, data: newQt };
      }
    }

    // Projects
    if (url.includes('/projects')) {
      if (method === 'get') {
        const id = url.split('/projects/')[1];
        if (id) {
          const proj = await mockService.getProjectById(id);
          return { success: true, data: proj };
        }
        const projs = await mockService.getProjects();
        return { success: true, data: projs };
      }
    }

    // Tasks
    if (url.includes('/tasks')) {
      if (method === 'get') {
        const tasks = await mockService.getTasks();
        return { success: true, data: tasks };
      }
      if (method === 'post') {
        const body = JSON.parse(config.data || '{}');
        const tsk = await mockService.createTask(body);
        return { success: true, data: tsk };
      }
    }

    // Invoices & Payments
    if (url.includes('/invoices')) {
      if (url.includes('/payments')) {
        const invoiceId = url.split('/invoices/')[1]?.split('/payments')[0];
        const body = JSON.parse(config.data || '{}');
        const res = await mockService.recordPayment(invoiceId, body);
        return { success: true, data: res };
      }
      if (method === 'get') {
        const id = url.split('/invoices/')[1];
        if (id) {
          const inv = await mockService.getInvoiceById(id);
          return { success: true, data: inv };
        }
        const invs = await mockService.getInvoices();
        return { success: true, data: invs };
      }
    }

    // Notifications
    if (url.includes('/notifications')) {
      if (method === 'get') {
        const notifs = await mockService.getNotifications();
        return { success: true, data: notifs };
      }
    }

    // Activities
    if (url.includes('/activities')) {
      const acts = await mockService.getActivities();
      return { success: true, data: acts };
    }

    // Fallback response for unhandled mock routes
    return { success: true, data: [] };
  } catch (err) {
    return Promise.reject(err);
  }
}
