import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  setupMfa: () => api.post('/auth/mfa/setup'),
  enableMfa: (code) => api.post('/auth/mfa/enable', { code }),
  disableMfa: (password) => api.post('/auth/mfa/disable', { password }),
};

// Dashboard endpoints
export const dashboardAPI = {
  getMyDashboard: () => api.get('/dashboard/my'),
  getExecutiveDashboard: () => api.get('/dashboard/executive'),
  getDeveloperDashboard: () => api.get('/dashboard/developer'),
  getValidatorDashboard: () => api.get('/dashboard/validator'),
  getRiskManagerDashboard: () => api.get('/dashboard/risk-manager'),
  getAdminDashboard: () => api.get('/dashboard/admin'),
};

// Model endpoints
export const modelAPI = {
  list: (params) => api.get('/models', { params }),
  get: (id) => api.get(`/models/${id}`),
  create: (data) => api.post('/models', data),
  update: (id, data) => api.put(`/models/${id}`, data),
  updateStatus: (id, status, reason) => api.patch(`/models/${id}/status`, { status, reason }),
  delete: (id) => api.delete(`/models/${id}`),
  getStatistics: (params) => api.get('/models/statistics', { params }),
  getAttention: () => api.get('/models/attention'),
};

// Validation endpoints
export const validationAPI = {
  list: (params) => api.get('/validations', { params }),
  get: (id) => api.get(`/validations/${id}`),
  create: (data) => api.post('/validations', data),
  update: (id, data) => api.put(`/validations/${id}`, data),
  start: (id) => api.post(`/validations/${id}/start`),
  complete: (id, data) => api.post(`/validations/${id}/complete`, data),
  addTestResult: (id, data) => api.post(`/validations/${id}/tests`, data),
  getStatistics: (params) => api.get('/validations/statistics', { params }),
  getUpcoming: (days) => api.get('/validations/upcoming', { params: { days } }),
  getOverdue: () => api.get('/validations/overdue'),
};

// Finding endpoints
export const findingAPI = {
  list: (params) => api.get('/findings', { params }),
  get: (id) => api.get(`/findings/${id}`),
  create: (data) => api.post('/findings', data),
  update: (id, data) => api.put(`/findings/${id}`, data),
  updateStatus: (id, status, comments) => api.patch(`/findings/${id}/status`, { status, comments }),
  getStatistics: (params) => api.get('/findings/statistics', { params }),
  getCritical: (limit) => api.get('/findings/critical', { params: { limit } }),
};

// Risk Assessment endpoints
export const riskAPI = {
  list: (params) => api.get('/risks', { params }),
  get: (id) => api.get(`/risks/${id}`),
  create: (data) => api.post('/risks', data),
  update: (id, data) => api.put(`/risks/${id}`, data),
  getStatistics: () => api.get('/risks/statistics'),
  getHeatmap: () => api.get('/risks/heatmap'),
  getForModel: (modelId) => api.get(`/risks/model/${modelId}`),
};

// Workflow endpoints
export const workflowAPI = {
  list: (params) => api.get('/workflows', { params }),
  get: (id) => api.get(`/workflows/${id}`),
  create: (data) => api.post('/workflows', data),
  approve: (id, decision, comments) => api.post(`/workflows/${id}/approve`, { decision, comments }),
  cancel: (id, reason) => api.post(`/workflows/${id}/cancel`, { reason }),
  getPending: () => api.get('/workflows/pending'),
  getStatistics: () => api.get('/workflows/statistics'),
};

// Task endpoints
export const taskAPI = {
  list: (params) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
  getMyTasks: (status) => api.get('/tasks/my', { params: { status } }),
  getOverdue: (userId) => api.get('/tasks/overdue', { params: { userId } }),
  getStatistics: (userId) => api.get('/tasks/statistics', { params: { userId } }),
};

// User endpoints
export const userAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
  delete: (id) => api.delete(`/users/${id}`),
  getByRole: (role) => api.get(`/users/roles/${role}`),
  getStatistics: () => api.get('/users/statistics'),
  getNotifications: (id, unreadOnly) => api.get(`/users/${id}/notifications`, { params: { unreadOnly } }),
  markNotificationsRead: (id, notificationIds) => api.post(`/users/${id}/notifications/read`, { notificationIds }),
};

export default api;
