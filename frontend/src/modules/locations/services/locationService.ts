import api from "@/config/api.config";
import type { Location } from "@/types";
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

const LocationService = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<Location>> => {
    const res = await api.get("/locations", { params: cleanParams(params) });
    return parsePaginatedResponse<Location>(res);
  },
};

export default LocationService;