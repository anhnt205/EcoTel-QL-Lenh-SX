import api from "@/config/api.config";
import type { TravelLog } from "@/types";

const TravelLogService = {
  getAll: async (params?: Record<string, any>): Promise<any> => {
    const res = await api.get("/travellogs", { params });
    return res.data.data;
  },
  create: async (data: Partial<TravelLog>): Promise<any> => {
    const res = await api.post("/travellogs", data);
    return res.data;
  },
  update: async (data: Partial<TravelLog>): Promise<any> => {
    const res = await api.put(`/travellogs/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete("/travellogs", { data: { ids } });
    return res.data.message;
  },
  importFile: async (
    formData: FormData,
    onProgress?: (percent: number) => void,
    type?: string,
  ) => {
    const res = await api.post(
      `/travellogs/importFile?type=${type}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (!onProgress) return;
          const total = e.total ?? 1;
          const percent = Math.round((e.loaded * 100) / total);
          onProgress(percent);
        },
      },
    );
    return res.data;
  },
  exportFile: async (type: string) => {
    const res = await api.post(
      "/travellogs/exportFile",
      { type },
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
    link.setAttribute("download", `*.xlsx`);

    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default TravelLogService;