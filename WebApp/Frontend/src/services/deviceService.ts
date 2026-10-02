import api from "../config/api.config";
import { Device } from "../types";
import { DeviceTypeEnum } from "../enums";

export interface DeviceListParams {
  type?: DeviceTypeEnum.MACHINE | DeviceTypeEnum.VEHICLE;
  q?: string;
  department?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface DeviceListResponse {
  status: string;
  results: number;
  page?: number;
  pageSize?: number;
  totalDocs: number;
  totalPages?: number;
  statusCounts: Record<string, number>;
  data: Device[];
}
const DeviceService = {
  getDevices: async (
    params?: DeviceListParams,
  ): Promise<DeviceListResponse> => {
    const res = await api.get("/devices", { params });
    return res.data;
  },
  getMachines: async (params?: Record<string, any>): Promise<any[]> => {
    const res = await api.get("/devices", { params });
    return res.data.data?.filter(
      (item: any) =>
        item?.category?.group.toLowerCase() ===
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
    const res = await api.delete(`/devices`, { data: { ids } });
    return res.data.message;
  },
  importDevicesFile: async (
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) => {
    const res = await api.post("/devices/importFile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (!onProgress) return;
        const total = e.total ?? 1;
        const percent = Math.round((e.loaded * 100) / total);
        onProgress(percent);
      },
    });
    return res.data as {
      summary: {
        totalProcessed: number;
        insertedCount: number;
        updatedCount: number;
      };
      invalidRows?: { row?: number; error: string }[];
    };
  },
  exportDevicesFile: async (
    type: DeviceTypeEnum.VEHICLE | DeviceTypeEnum.MACHINE,
    filters?: {
      q?: string;
      department?: string;
      status?: string;
    },
  ) => {
    const res = await api.post(
      "/devices/exportFile",
      { type, ...filters },
      {
        responseType: "blob",
      },
    );
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${type}.xlsx`);

    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default DeviceService;
