import api from "@/config/api.config";
import type { CargoType } from "@/types";
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

const CargoTypeService = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<CargoType>> => {
    const res = await api.get("/cargo-types", { params: cleanParams(params) });
    return parsePaginatedResponse<CargoType>(res);
  },
  getById: async (id: string | number): Promise<CargoType> => {
    const res = await api.get(`/cargo-types/${id}`);
    return res.data?.data || res.data?.result;
  },
};

export default CargoTypeService;
