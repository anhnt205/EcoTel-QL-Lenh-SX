import api from "@/config/api.config";
import type { Department } from "@/types";
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

export interface DepartmentPayload {
  code: string;
  name: string;
  description?: string;
  allowedResources: string[];
}

const DepartmentService = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<Department>> => {
    const res = await api.get("/departments", { params: cleanParams(params) });
    return parsePaginatedResponse<Department>(res);
  },
  /** Toàn bộ resource hợp lệ — dựng checkbox "chức năng" khi thêm/sửa phòng ban. */
  getAvailableResources: async (): Promise<string[]> => {
    const res = await api.get("/departments/available-resources");
    return res.data?.data ?? [];
  },
  create: async (payload: DepartmentPayload): Promise<Department> => {
    const res = await api.post("/departments", payload);
    return res.data?.data;
  },
  update: async (id: number, payload: DepartmentPayload): Promise<Department> => {
    const res = await api.put(`/departments/${id}`, payload);
    return res.data?.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};

export default DepartmentService;
