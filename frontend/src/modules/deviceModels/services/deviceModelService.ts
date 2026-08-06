import api from "@/config/api.config";
import type { DeviceModel } from "@/types";

const DeviceModelService = {
  getAll: async (params?: Record<string, any>): Promise<DeviceModel[]> => {
    const res = await api.get("/devicemodels", { params });
    return res.data.data;
  },
  create: async (data: Partial<DeviceModel>): Promise<any> => {
    const res = await api.post("/devicemodels", data);
    return res.data;
  },
  update: async (data: Partial<DeviceModel>): Promise<any> => {
    const res = await api.put(`/devicemodels/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete(`/devicemodels`, { data: { ids } });
    return res.data.message;
  },
  importFile: async (formData: FormData) => {
    const res = await api.post("/devicemodels/importFile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.message;
  },
  exportFile: async () => {
    const res = await api.post(
      "/devicemodels/exportFile",
      {},
      { responseType: "blob" }
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

export default DeviceModelService;
