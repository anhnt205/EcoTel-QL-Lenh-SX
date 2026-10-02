import { useQuery } from "@tanstack/react-query";
import api from "../config/api.config";
import { Device, Job, ListResponse, Location, Position } from "../types";

const JobService = {
  getAll: async (params?: Record<string, any>): Promise<ListResponse> => {
    const res = await api.get("/jobs", { params });
    return res.data;
  },
  create: async (data: Partial<Job>): Promise<any> => {
    const res = await api.post("/jobs", data);
    return res.data;
  },
  update: async (data: Partial<Job>): Promise<any> => {
    const res = await api.put(`/jobs/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete(`/jobs`, { data: { ids } });
    return res.data.message;
  },
  importFile: async (
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) => {
    const res = await api.post("/jobs/importFile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (!onProgress) return;
        const total = e.total ?? 1;
        const percent = Math.round((e.loaded * 100) / total);
        onProgress(percent);
      },
    });
    return res.data.message;
  },
  exportFile: async () => {
    const res = await api.post(
      "/jobs/exportFile",
      {},
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

export default JobService;
