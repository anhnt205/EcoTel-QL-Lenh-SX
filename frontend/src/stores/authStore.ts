import { create } from "zustand";
import { tokenService } from "@/auth/tokenService";

export interface PermissionDto {
  c: boolean;
  r: boolean;
  u: boolean;
  d: boolean;
  a: boolean;
}

export interface AppUser {
  username: string;
  fullName: string;
  companyId: number | null;
  app: string;
  permissions: Record<string, PermissionDto>;
}

interface AuthState {
  loading: boolean;
  user: AppUser | null;

  /** Khởi tạo auth state từ tokenService (gọi 1 lần khi app mount) */
  initAuth: () => void;

  /** Lưu token và decode user info */
  setAuth: (appToken: string, refreshToken: string) => void;

  /** Xóa toàn bộ auth state */
  clearAuth: () => void;

  /** Kiểm tra user đã đăng nhập chưa */
  isAuthenticated: () => boolean;
}

function decodeUserFromToken(token: string): AppUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      username: payload.username,
      fullName: payload.fullName,
      companyId: payload.companyId ?? null,
      app: payload.app,
      permissions: payload.permissions ?? {},
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  loading: false, // [AUTH DISABLED] - không cần chờ xác thực
  user: null,

  initAuth: () => {
    const token = tokenService.getAppToken();
    if (token && tokenService.isValid()) {
      const user = decodeUserFromToken(token);
      set({ user, loading: false });
    } else {
      set({ user: null, loading: false });
    }
  },

  setAuth: (appToken: string, refreshToken: string) => {
    tokenService.saveTokens(appToken, refreshToken);
    const user = decodeUserFromToken(appToken);
    set({ user, loading: false });
  },

  clearAuth: () => {
    tokenService.clear();
    set({ user: null, loading: false });
  },

  isAuthenticated: () => {
    return true; // [AUTH DISABLED] - luôn cho phép truy cập
  },
}));

// Non-hook accessors (dùng ngoài React component)
export const getCurrentUser = () => useAuthStore.getState().user;
export const isAuth = () => useAuthStore.getState().isAuthenticated();
