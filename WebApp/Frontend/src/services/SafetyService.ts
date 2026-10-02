import api from "../config/api.config";
import { SafetyMeasure } from "../types";
export interface SafetyMeasureListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface SafetyMeasureListResponse {
  status: string;
  results: number;
  page?: number;
  pageSize?: number;
  totalDocs: number;
  totalPages?: number;
  data: any[];
}
const SafetyService = {
  getAll: async (
    params?: SafetyMeasureListParams,
  ): Promise<SafetyMeasureListResponse> => {
    const res = await api.get("/safetyMeasures", { params });
    return res.data;
  },
  create: async (data: Partial<SafetyMeasure>): Promise<any> => {
    const res = await api.post("/safetyMeasures", data);
    return res.data;
  },
  update: async (data: Partial<SafetyMeasure>): Promise<any> => {
    const res = await api.put(`/safetyMeasures/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete(`/safetyMeasures`, { data: { ids } });
    return res.data.message;
  },
  importFile: async (
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) => {
    const res = await api.post("/safetyMeasures/importFile", formData, {
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
      "/safetyMeasures/exportFile",
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

export default SafetyService;
