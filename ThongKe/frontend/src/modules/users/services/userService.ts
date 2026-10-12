import api from "@/config/api.config";
import type { User, PositionPermissionItem } from "@/types";
import { parsePaginatedResponse, type PaginatedResponse } from "@/types";

const cleanParams = (params?: Record<string, any>) => {
  if (!params) return undefined;
  const cleaned: Record<string, any> = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== "") {
      cleaned[key] = val;
    }
  });
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

export interface UserCreatePayload {
  username: string;
  password: string;
  salaryCode: string;
  fullName: string;
  positionId: number;
  /** Để trống = tài khoản thừa kế quyền theo Chức vụ, không phải "không có quyền". */
  permissions: PositionPermissionItem[];
}

export interface UserUpdatePayload {
  salaryCode: string;
  fullName: string;
  positionId: number;
  active: boolean;
  /** Để trống = giữ nguyên mật khẩu cũ. */
  password?: string;
  permissions: PositionPermissionItem[];
}

const UserService = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<User>> => {
    const res = await api.get("/users", { params: cleanParams(params) });
    return parsePaginatedResponse<User>(res);
  },
  getById: async (id: string | number): Promise<User> => {
    const res = await api.get(`/users/${id}`);
    return res.data?.data || res.data?.result;
  },
  create: async (payload: UserCreatePayload): Promise<User> => {
    const res = await api.post("/users", payload);
    return res.data?.data;
  },
  update: async (id: number, payload: UserUpdatePayload): Promise<User> => {
    const res = await api.put(`/users/${id}`, payload);
    return res.data?.data;
  },
};

export default UserService;
