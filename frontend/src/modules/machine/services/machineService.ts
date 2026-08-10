import api from "@/config/api.config";
import type { Device } from "@/types";
import { DeviceTypeEnum } from "@/enums";

const cleanParams = (params?: Record<string, any>) => {
  if (!params) return undefined;
  const cleaned: Record<string, any> = {};
  const kw = params.keyword || params.q || params.name;
  if (kw !== undefined && kw !== null && kw !== "") {
    cleaned.keyword = kw;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

const extractDevices = (res: any): Device[] => {
  const data =
    res.data?.data?.content ||
    res.data?.data ||
    res.data?.result?.data ||
    res.data;
  return Array.isArray(data) ? data : [];
};

const MachineService = {
  getMachines: async (params?: Record<string, any>): Promise<Device[]> => {
    const res = await api.get("/devices", { params: cleanParams(params) });
    const list = extractDevices(res);
    return list.filter((item: any) => {
      const groupStr =
        item?.categoryName || item?.category?.group || item?.category || "";
      if (!groupStr) return true;
      return (
        groupStr
          .toString()
          .toLowerCase()
          .includes(DeviceTypeEnum.MACHINE.toLowerCase()) ||
        groupStr.toString().toLowerCase().includes("máy") ||
        groupStr.toString().toLowerCase().includes("may")
      );
    });
  },
  getAllMachines: async (params?: Record<string, any>): Promise<Device[]> => {
    const res = await api.get("/devices", { params: cleanParams(params) });
    const list = extractDevices(res);
    return list.filter((item: any) => {
      const groupStr =
        item?.categoryName || item?.category?.group || item?.category || "";
      if (!groupStr) return true;
      return (
        groupStr
          .toString()
          .toLowerCase()
          .includes(DeviceTypeEnum.MACHINE.toLowerCase()) ||
        groupStr.toString().toLowerCase().includes("máy") ||
        groupStr.toString().toLowerCase().includes("may")
      );
    });
  },
};

export default MachineService;
