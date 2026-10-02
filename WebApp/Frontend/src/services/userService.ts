import { useQuery } from "@tanstack/react-query";
import api from "../config/api.config";
import { Device, ListResponse, User } from "../types";

const UserService = {
  getAll: async (params?: Record<string, any>): Promise<ListResponse> => {
    const res = await api.get("/users", { params });
    return res.data;
  },
  create: async (data: Partial<User>): Promise<any> => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },
  update: async (data: Partial<User>): Promise<any> => {
    const res = await api.put(`/users/update/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete(`/users`, { data: { ids } });
    return res.data.message;
  },
  resetPass: async (id: string): Promise<any> => {
    const res = await api.get(`/users/resetpass/${id}`);
    return res.data;
  },
  importFile: async (
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) => {
    const res = await api.post("/users/importFile", formData, {
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
  exportFile: async () => {
    const res = await api.post(
      "/users/exportFile",
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

export default UserService;
