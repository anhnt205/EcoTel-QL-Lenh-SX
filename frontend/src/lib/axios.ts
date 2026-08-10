import axios from 'axios';
import { API } from '@/constants/api-endpoint';
import { useAuthStore } from '@/modules/auth/stores/auth.store';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawBaseUrl && import.meta.env.PROD) {
  throw new Error(
    '[Config Error] VITE_API_BASE_URL is not defined. ' +
      'Set this environment variable before building for production.'
  );
}

const BASE_URL = rawBaseUrl ?? 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: gắn access token ────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: xử lý 401 → refresh → retry ────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processPendingQueue = (error: unknown, token: string | null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Chỉ thử refresh 1 lần
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Nếu đang refresh → đưa request vào queue chờ
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { accessToken, refreshToken } = useAuthStore.getState();

      if (!accessToken || !refreshToken) {
        throw new Error('No tokens available');
      }

      // Dùng axios gốc (không có interceptor) để tránh loop
      const refreshResponse = await axios.post(
        `${BASE_URL}${API.AUTH.REFRESH}`,
        { accessToken, refreshToken }
      );

      const newTokens = refreshResponse.data.result;
      useAuthStore.getState().setTokens(newTokens);

      processPendingQueue(null, newTokens.accessToken);

      originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processPendingQueue(refreshError, null);
      console.warn('[Mock Mode] Refresh token failed - Bypassing redirect to sign-in');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
