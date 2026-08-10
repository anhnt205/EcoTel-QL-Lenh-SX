import api from "@/config/api.config";
import type { CargoGroup } from "@/types";

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

const CargoGroupService = {
  getAll: async (params?: Record<string, any>): Promise<CargoGroup[]> => {
    const res = await api.get("/cargo-groups", { params: cleanParams(params) });
    const data =
      res.data?.data?.content ||
      res.data?.data ||
      res.data?.result?.data ||
      res.data;
    return Array.isArray(data) ? data : [];
  },
  getById: async (id: string | number): Promise<CargoGroup> => {
    const res = await api.get(`/cargo-groups/${id}`);
    return res.data?.data || res.data?.result;
  },
};

export default CargoGroupService;
