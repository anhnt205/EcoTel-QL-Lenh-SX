import { create } from "zustand";
import { tokenService, decodeJwtPayload } from "@/auth/tokenService";

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
    const payload = decodeJwtPayload(token);
    console.log("[AuthStore] Decoded JWT payload:", payload);
    if (!payload) return null;
    return {
      username: payload.username,
      fullName: payload.fullName,
      companyId: payload.companyId ?? null,
      app: payload.app,
      permissions: payload.permissions ?? {},
    };
  } catch (e) {
    console.error("[AuthStore] decodeUserFromToken failed:", e);
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  loading: true,
  user: null,

  initAuth: () => {
    const token = tokenService.getAppToken();
    const isValid = tokenService.isValid();
    console.log("[AuthStore] initAuth running:", { hasToken: !!token, isValid });
    if (token && isValid) {
      const user = decodeUserFromToken(token);
      console.log("[AuthStore] initAuth setting user:", user);
      set({ user, loading: false });
    } else {
      console.warn("[AuthStore] initAuth failed validation, clearing user state");
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
    const { user } = get();
    const isValid = tokenService.isValid();
    const isAuthed = user !== null && isValid;
    console.log("[AuthStore] isAuthenticated:", { hasUser: !!user, isValid, isAuthed });
    return isAuthed;
  },
}));

// Non-hook accessors (dùng ngoài React component)
export const getCurrentUser = () => useAuthStore.getState().user;
export const isAuth = () => useAuthStore.getState().isAuthenticated();
