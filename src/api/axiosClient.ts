import axios from 'axios';

const STORAGE_KEY = 'ips_api_key';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// A registered callback to fetch Clerk's JWT token dynamically from React context
let getClerkToken: ((options?: { skipCache?: boolean }) => Promise<string | null>) | null = null;

export const setClerkTokenFetcher = (
  fetcher: (options?: { skipCache?: boolean }) => Promise<string | null>
) => {
  getClerkToken = fetcher;
};

export const clearStoredApiKey = () => {
  localStorage.removeItem(STORAGE_KEY);
};

axiosClient.interceptors.request.use(
  async (config) => {
    // If VITE_DEV_BYPASS_AUTH is explicitly true, skip Authorization header entirely (Section 5 of frontend_auth.md)
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      delete config.headers.Authorization;
      return config;
    }

    // 1. Check for long-lived backend API key in localStorage (Mode 1 - Section 3 of frontend_auth.md)
    const storedApiKey = localStorage.getItem(STORAGE_KEY);
    if (storedApiKey) {
      config.headers.Authorization = `Bearer ${storedApiKey}`;
      return config;
    }

    // 2. Fall back to fresh Clerk JWT (Mode 2 - Section 4 of frontend_auth.md)
    if (getClerkToken) {
      try {
        const token = await getClerkToken({ skipCache: true });
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Failed to attach Clerk token to request:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._isRetry
    ) {
      originalRequest._isRetry = true;

      // If stored API key failed (invalid/deactivated), clear it
      if (localStorage.getItem(STORAGE_KEY)) {
        clearStoredApiKey();
      }

      // Fetch fresh Clerk token (bypassing any cached state)
      if (getClerkToken) {
        try {
          const freshToken = await getClerkToken({ skipCache: true });
          if (freshToken) {
            originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            return axiosClient(originalRequest);
          }
        } catch (refreshErr) {
          console.error('Clerk token refresh on 401 failed:', refreshErr);
        }
      }

      // If token refresh wasn't possible or failed, attempt unsanitized request
      // in case backend is running in DEV_BYPASS_AUTH mode
      delete originalRequest.headers.Authorization;
      return axiosClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

