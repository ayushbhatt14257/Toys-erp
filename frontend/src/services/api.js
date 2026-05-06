import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request: attach token if present
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: handle errors globally
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.message || 'Something went wrong';
    const status = err.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error('You do not have permission to do this.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject({ ...err, message });
  }
);

export default api;
