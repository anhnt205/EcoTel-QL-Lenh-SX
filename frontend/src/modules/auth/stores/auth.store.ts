import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { API } from '@/constants/api-endpoint';
import type { UserInfo, TokenData, LoginRequest } from '@/modules/auth/types/auth.types';
import type { UserRole } from '@/constants/roles';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const MOCK_USERS: Record<string, UserInfo> = {
  admin: {
    id: 'mock-admin-id',
    hoTen: 'Quản trị viên (Admin)',
    username: 'admin',
    role: 'admin',
    trangThai: 'active',
    ngayTao: new Date().toISOString(),
  },
  nhaplieu: {
    id: 'mock-nhaplieu-id',
    hoTen: 'Cán bộ Nhập liệu',
    username: 'nhaplieu',
    role: 'nhap_lieu',
    trangThai: 'active',
    ngayTao: new Date().toISOString(),
  },
  baocao: {
    id: 'mock-baocao-id',
    hoTen: 'Cán bộ Báo cáo',
    username: 'baocao',
    role: 'bao_cao',
    trangThai: 'active',
    ngayTao: new Date().toISOString(),
  },
};

const DEFAULT_MOCK_USER = MOCK_USERS.admin;
const DEFAULT_MOCK_TOKEN = 'mock-access-token';

interface AuthState {
  // State
  user: UserInfo | null;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiryTime: string | null;

  // Selectors
  isAuthenticated: () => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;

  // Actions
  setTokens: (data: TokenData) => void;
  setUser: (user: UserInfo) => void;
  clearAuth: () => void;
  signIn: (credentials: LoginRequest) => Promise<void>;
  signOut: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state - default to mock admin so login is bypassed by default
      user: DEFAULT_MOCK_USER,
      loading: false,
      accessToken: DEFAULT_MOCK_TOKEN,
      refreshToken: 'mock-refresh-token',
      refreshTokenExpiryTime: new Date(Date.now() + 864000000).toISOString(),

      // Selectors
      isAuthenticated: () => {
        const { user } = get();
        return !!user;
      },

      hasRole: (roles: UserRole | UserRole[]) => {
        const { user } = get();
        if (!user) return true;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },

      // Actions
      setTokens: (data: TokenData) => {
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          refreshTokenExpiryTime: data.refreshTokenExpiryTime,
        });
      },

      setUser: (user: UserInfo) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          refreshTokenExpiryTime: null,
          loading: false,
        });
      },

      signIn: async (credentials: LoginRequest) => {
        set({ loading: true });
        try {
          const response = await axios.post(
            `${BASE_URL}${API.AUTH.SIGN_IN}`,
            credentials
          );
          const { user, ...tokens } = response.data.result;
          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            refreshTokenExpiryTime: tokens.refreshTokenExpiryTime,
            loading: false,
          });
        } catch {
          // Fallback to mock user when BE is not available
          const uname = credentials.username?.toLowerCase() || 'admin';
          const mockUser = MOCK_USERS[uname] || {
            id: `mock-${uname}`,
            hoTen: `Người dùng (${credentials.username})`,
            username: credentials.username,
            role: (uname === 'baocao' ? 'bao_cao' : uname === 'nhaplieu' ? 'nhap_lieu' : 'admin') as UserRole,
            trangThai: 'active',
            ngayTao: new Date().toISOString(),
          };
          set({
            user: mockUser,
            accessToken: DEFAULT_MOCK_TOKEN,
            refreshToken: 'mock-refresh-token',
            refreshTokenExpiryTime: new Date(Date.now() + 864000000).toISOString(),
            loading: false,
          });
        }
      },

      signOut: () => {
        get().clearAuth();
        window.location.href = '/auth/sign-in';
      },

      initAuth: async () => {
        const { accessToken, user } = get();
        if (!accessToken || !user) {
          set({
            user: DEFAULT_MOCK_USER,
            accessToken: DEFAULT_MOCK_TOKEN,
            loading: false,
          });
          return;
        }
        try {
          const response = await axios.get(`${BASE_URL}${API.AUTH.ME}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          set({ user: response.data.result, loading: false });
        } catch {
          // Keep mock user when BE is unavailable instead of clearing auth
          set({
            user: user || DEFAULT_MOCK_USER,
            loading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        refreshTokenExpiryTime: state.refreshTokenExpiryTime,
        user: state.user,
      }),
    }
  )
);

