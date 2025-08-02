import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response;
  },
  
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response;
  },
  
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },
};

// Summary service
export const summaryService = {
  uploadFile: async (file, provider = 'gemini', onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('provider', provider);
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 1 minute for file uploads
    };
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }
    
    const response = await api.post('/summaries/upload', formData, config);
    return response;
  },
  
  processUrl: async (url, provider = 'gemini') => {
    const response = await api.post('/summaries/url', { url, provider });
    return response;
  },
  
  getJobStatus: async (jobId) => {
    const response = await api.get(`/summaries/job/${jobId}`);
    return response;
  },
  
  getSummaries: async (page = 1, limit = 10) => {
    const response = await api.get(`/summaries/history?page=${page}&limit=${limit}`);
    return response;
  },
  
  deleteSummary: async (summaryId) => {
    const response = await api.delete(`/summaries/${summaryId}`);
    return response;
  },
  
  testProviders: async () => {
    const response = await api.get('/summaries/providers/test');
    return response;
  },
};

// Export the configured axios instance
export default api;