import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// A registered callback to fetch Clerk's JWT token dynamically from the React context
let getClerkToken: (() => Promise<string | null>) | null = null;

export const setClerkTokenFetcher = (fetcher: () => Promise<string | null>) => {
  getClerkToken = fetcher;
};

axiosClient.interceptors.request.use(
  async (config) => {
    if (getClerkToken) {
      try {
        const token = await getClerkToken();
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
  (error) => {
    if (error.response && error.response.status === 401) {
      // Formally redirect to sign-in upon receiving a 401 Unauthorized from the server
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
