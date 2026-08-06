import api from "@/config/api.config";
import type { Device } from "@/types";
import { DeviceTypeEnum } from "@/enums";

const MachineService = {
  getMachines: async (params?: Record<string, any>): Promise<Device[]> => {
    const res = await api.get("/devices", { params });
    return (res.data.data || []).filter(
      (item: any) =>
        item?.category?.group?.toLowerCase() ===
        DeviceTypeEnum.MACHINE.toLowerCase(),
    );
  },
  getAllMachines: async (params?: Record<string, any>): Promise<Device[]> => {
    const res = await api.get("/devices", { params });
    return (res.data.data || []).filter(
      (item: any) =>
        item?.category?.group?.toLowerCase() ===
        DeviceTypeEnum.MACHINE.toLowerCase(),
    );
  },
  create: async (data: Partial<Device>): Promise<any> => {
    const res = await api.post("/devices", data);
    return res.data;
  },
  update: async (data: Partial<Device>): Promise<any> => {
    const res = await api.put(`/devices/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete("/devices", { data: { ids } });
    return res.data.message;
  },
  importFile: async (formData: FormData) => {
    const res = await api.post("/devices/importFile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  exportFile: async (machines: Device[]) => {
    const res = await api.post(
      "/devices/exportFile",
      { data: machines },
      { responseType: "blob" },
    );
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "*.xlsx");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default MachineService;
