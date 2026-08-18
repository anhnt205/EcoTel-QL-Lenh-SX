import axios from "axios";
import { tokenService } from "../auth/tokenService";

const API_URL = import.meta.env.VITE_API_KONG_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenService.getAppToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const stored = tokenService.get();
  if (!stored?.refreshToken) {
    throw new Error("No refresh token");
  }
  const { data } = await axios.post(`${API_URL}/auth/refresh`, {
    refreshToken: stored.refreshToken,
  });
  tokenService.saveTokens(data.appToken, data.refreshToken);
  return data.appToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh thất bại — xóa token và clear authStore để React cập nhật UI
        const { useAuthStore } = await import("@/stores/authStore");
        useAuthStore.getState().clearAuth();
        console.error("[Auth] Token refresh failed");
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
