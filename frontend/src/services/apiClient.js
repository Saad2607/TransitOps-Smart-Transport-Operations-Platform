import axios from 'axios';

const TOKEN_KEY = 'transitops_token';
const USER_KEY = 'transitops_user';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Inject JWT on every outgoing request */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/** Normalize API errors and handle expired sessions */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Request failed';

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    // Keep status + details so pages can react to specific API
    // rejections (409 duplicate, 403 license/suspension) in the UI.
    const normalizedError = new Error(message);
    normalizedError.status = status;
    normalizedError.details = error.response?.data?.details;

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
