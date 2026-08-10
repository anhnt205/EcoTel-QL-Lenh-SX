import api from "@/config/api.config";
import type { Material } from "@/types";

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

const MaterialService = {
  getAll: async (params?: Record<string, any>): Promise<Material[]> => {
    const res = await api.get("/materials", { params: cleanParams(params) });
    const data = res.data?.data?.content || res.data?.data || res.data?.result?.data || res.data;
    return Array.isArray(data) ? data : [];
  },
};

export default MaterialService;