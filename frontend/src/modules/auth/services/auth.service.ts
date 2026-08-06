import api from '@/lib/axios';
import { API } from '@/constants/api-endpoint';
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  ApiResponse,
  UserInfo,
} from '@/modules/auth/types/auth.types';

export const authService = {
  signIn: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post(API.AUTH.SIGN_IN, data);
    return response.data;
  },

  refreshToken: async (
    accessToken: string,
    refreshToken: string
  ): Promise<RefreshResponse> => {
    const response = await api.post(API.AUTH.REFRESH, {
      accessToken,
      refreshToken,
    });
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<UserInfo>> => {
    const response = await api.get(API.AUTH.ME);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> => {
    const response = await api.post(API.AUTH.CHANGE_PASSWORD, data);
    return response.data;
  },
};
