import api from "@/config/api.config";
import type { Position, PositionPermissionItem } from "@/types";
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

export interface PositionPayload {
  code: string;
  name: string;
  description?: string;
  departmentId: number;
  permissions: PositionPermissionItem[];
}

const PositionService = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<Position>> => {
    const res = await api.get("/positions", { params: cleanParams(params) });
    return parsePaginatedResponse<Position>(res);
  },
  getById: async (id: number): Promise<Position> => {
    const res = await api.get(`/positions/${id}`);
    return res.data?.data;
  },
  create: async (payload: PositionPayload): Promise<Position> => {
    const res = await api.post("/positions", payload);
    return res.data?.data;
  },
  update: async (id: number, payload: PositionPayload): Promise<Position> => {
    const res = await api.put(`/positions/${id}`, payload);
    return res.data?.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/positions/${id}`);
  },
};

export default PositionService;
