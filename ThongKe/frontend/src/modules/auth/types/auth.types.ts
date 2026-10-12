export type UserRole = 'admin' | 'nhap_lieu' | 'bao_cao';

export type UserStatus = 'active' | 'inactive';

export interface UserInfo {
  id: string;
  hoTen: string;
  username: string;
  role: UserRole;
  trangThai: UserStatus;
  ngayTao: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiryTime: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  result: TokenData & { user: UserInfo };
}

export interface RefreshResponse {
  success: boolean;
  result: TokenData;
}

export interface CreateUserRequest {
  hoTen: string;
  username: string;
  password: string;
  role: UserRole;
}
export interface ApiResponse<T> {
  success: boolean;
  result: T;
  message?: string;
}
