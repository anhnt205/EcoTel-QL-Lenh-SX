import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { API } from '@/constants/api-endpoint';
import type { UserInfo, TokenData, LoginRequest } from '@/modules/auth/types/auth.types';
import type { UserRole } from '@/constants/roles';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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
      // Initial state
      user: null,
      loading: true,
      accessToken: null,
      refreshToken: null,
      refreshTokenExpiryTime: null,

      // Selectors
      isAuthenticated: () => {
        const { accessToken, user } = get();
        return !!accessToken && !!user;
      },

      hasRole: (roles: UserRole | UserRole[]) => {
        const { user } = get();
        if (!user) return false;
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
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signOut: () => {
        get().clearAuth();
        window.location.href = '/auth/sign-in';
      },

      initAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ loading: false });
          return;
        }
        try {
          const response = await axios.get(`${BASE_URL}${API.AUTH.ME}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          set({ user: response.data.result, loading: false });
        } catch {
          get().clearAuth();
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
