import api from "@/config/api.config";
import type { Device } from "@/types";
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
  const kw = params.keyword || params.q || params.name;
  if (kw !== undefined && kw !== null && kw !== "") {
    cleaned.keyword = kw;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

const MachineService = {
  getMachines: async (params?: Record<string, any>): Promise<PaginatedResponse<Device>> => {
    const res = await api.get("/devices", { params: cleanParams({ categoryName: "Máy xúc", categoryGroup: "MAY", ...params }) });
    return parsePaginatedResponse<Device>(res);
  },
  getAllMachines: async (params?: Record<string, any>): Promise<Device[]> => {
    const res = await api.get("/devices", { params: cleanParams({ categoryName: "Máy xúc", categoryGroup: "MAY", ...params, size: 1000 }) });
    const parsed = parsePaginatedResponse<Device>(res);
    return parsed.content;
  },
};

export default MachineService;
