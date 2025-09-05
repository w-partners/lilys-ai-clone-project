import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api',
  timeout: 90000, // Increased to 90 seconds for YouTube processing
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
  login: async (phone, password) => {
    const response = await api.post('/auth/login', { phone, password });
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
  
  processUrl: async (url, provider = 'gemini', apiKey = null) => {
    // YouTube URL 처리를 위한 전용 엔드포인트 사용
    const response = await api.post('/summaries/youtube', { 
      url, 
      provider,
      apiKey,
      background: false // 즉시 처리하여 결과 반환
    });
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
  
  getSummary: async (summaryId) => {
    const response = await api.get(`/summaries/${summaryId}`);
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
  
  getApiKeys: async () => {
    const response = await api.get('/summaries/providers/keys');
    return response;
  },
  
  sendEmail: async (data) => {
    const response = await api.post('/summaries/send-email', data);
    return response;
  },
  
  getStats: async () => {
    const response = await api.get('/summaries/stats');
    return response;
  },
  
  processContent: async (url, provider = 'gemini', apiKey = null, email = null) => {
    const response = await api.post('/summaries/process', { 
      url, 
      apiKey,
      email,
      inputType: 'youtube'
    });
    return response;
  },
};

// System prompts service
export const systemPromptService = {
  getAll: async () => {
    const response = await api.get('/system-prompts');
    return response;
  },
  
  getPublic: async () => {
    // Public API - no authentication required
    const response = await axios.get(`${api.defaults.baseURL}/system-prompts/public`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/system-prompts/${id}`);
    return response;
  },
  
  create: async (data) => {
    const response = await api.post('/system-prompts', data);
    return response;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/system-prompts/${id}`, data);
    return response;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/system-prompts/${id}`);
    return response;
  },
};

// User service
export const userService = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response;
  },
  
  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    return response;
  },
  
  updateApiKeys: async (data) => {
    const response = await api.put('/users/api-keys', data);
    return response;
  },
  
  getAll: async () => {
    const response = await api.get('/users');
    return response;
  },
  
  updateUser: async (userId, data) => {
    const response = await api.put(`/users/${userId}`, data);
    return response;
  },
  
  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response;
  },
};

// Export the configured axios instance
export default api;