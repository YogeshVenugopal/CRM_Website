import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach access token from cookie if needed
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// Response interceptor — unwrap backend envelope and handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns { success, data, meta } — pass through
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const serverError = error.response?.data?.error;
    const serverMessage =
      serverError?.message || error.response?.data?.message || '';

    // Network error — backend is down
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      const err = new Error('Unable to connect to server. Please check your connection and try again.');
      err.status = 0;
      err.code = 'NETWORK_ERROR';
      return Promise.reject(err);
    }

    // Build user-friendly message based on status
    let userMessage = 'An unexpected error occurred. Please try again.';

    if (status === 401) {
      userMessage = 'Session expired. Please log in again.';
      // Clear any stale auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crm_current_user');
      }
    } else if (status === 403) {
      userMessage = "You don't have permission to perform this action.";
    } else if (status === 404) {
      userMessage = 'The requested resource was not found.';
    } else if (status === 409) {
      userMessage = serverMessage || 'A conflict occurred with existing data.';
    } else if (status === 422) {
      userMessage = serverMessage || 'Validation failed. Please check your input.';
    } else if (status >= 500) {
      userMessage = 'Server error. Please try again in a few moments.';
    } else if (serverMessage) {
      userMessage = serverMessage;
    }

    const enhancedError = new Error(userMessage);
    enhancedError.status = status;
    enhancedError.code = serverError?.code || '';
    enhancedError.details = serverError?.details || {};
    enhancedError.originalError = error;
    return Promise.reject(enhancedError);
  },
);
