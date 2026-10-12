import api from "@/config/api.config";
import type { Shift } from "@/types";
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

const ShiftService = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<Shift>> => {
    const res = await api.get("/shifts", { params: cleanParams(params) });
    return parsePaginatedResponse<Shift>(res);
  },
  getById: async (id: string | number): Promise<Shift> => {
    const res = await api.get(`/shifts/${id}`);
    return res.data?.data || res.data?.result;
  },
};

export default ShiftService;
