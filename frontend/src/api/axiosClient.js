import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT token if present in localStorage or sessionStorage
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('teacher_token') || sessionStorage.getItem('teacher_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract response data and handle common errors
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const res = error.response;
    let message = 'An unexpected error occurred. Please try again.';

    if (res && res.data) {
      if (typeof res.data.text === 'function') {
        try {
          const text = await res.data.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.message) message = parsed.message;
        } catch (_) {}
      } else if (res.data.message) {
        message = res.data.message;
      }
    } else if (error.message) {
      message = error.message;
    }

    // Auto logout on 401 if token was expired/invalid
    if (res && res.status === 401) {
      localStorage.removeItem('teacher_token');
      localStorage.removeItem('teacher_user');
      sessionStorage.removeItem('teacher_token');
      sessionStorage.removeItem('teacher_user');
      const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const loginUrl = `${basePath}/login?expired=1`;
      if (!window.location.pathname.endsWith('/login') && !window.location.pathname.endsWith('/register')) {
        window.location.href = loginUrl;
      }
    }

    const wrappedErr = new Error(message);
    wrappedErr.status = res?.status;
    return Promise.reject(wrappedErr);
  }
);

export default axiosClient;
