import axios from 'axios';
import { getToken } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      const { clearToken } = await import('./auth');
      await clearToken();
      window.location.reload();
    }

    const message = error.response?.data?.error || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export const login = async (email, apiKey) => {
  const response = await api.post('/api/auth/login', { email, apiKey });
  return response.data;
};

export const uploadScreenshot = async (screenshotBlob) => {
  const formData = new FormData();
  formData.append('file', screenshotBlob, 'screenshot.png');

  const response = await api.post('/api/screenshots', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const saveCapture = async (captureData) => {
  const response = await api.post('/api/captures', captureData);
  return response.data;
};

export const verifyToken = async () => {
  try {
    await api.get('/api/researcher/me');
    return true;
  } catch (error) {
    return false;
  }
};

export default api;
