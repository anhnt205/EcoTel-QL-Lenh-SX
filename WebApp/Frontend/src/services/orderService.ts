import { useQuery } from "@tanstack/react-query";
import api from "../config/api.config";
import { Device, Location, Material, Order } from "../types";
import { Dayjs } from "dayjs";

const OrderService = {
  getAll: async (params?: Record<string, any>): Promise<any> => {
    const res = await api.get("/orders", { params });
    return res.data;
  },
  /** Giá trị khác nhau của một cột (hộp lọc kiểu Excel) — kèm đúng các bộ lọc đang áp dụng. */
  getColumnValues: async (params: Record<string, any>): Promise<{ values: string[]; truncated: boolean }> => {
    const res = await api.get("/orders/column-values", { params });
    return { values: res.data.values ?? [], truncated: Boolean(res.data.truncated) };
  },
  getAllDispatcher: async (params?: Record<string, any>): Promise<any[]> => {
    const res = await api.get("/orders", { params });
    return res.data.data;
  },
  getByUser: async (params?: Record<string, any>): Promise<any> => {
    const res = await api.get("/orders/user", { params });
    return res.data;
  },
  create: async (data: Partial<Order>): Promise<any> => {
    const res = await api.post("/orders", data);
    return res.data;
  },
  update: async (data: Partial<Order>): Promise<any> => {
    const res = await api.put(`/orders/${data?._id}`, data);
    return res.data;
  },
  delete: async (ids: string[]): Promise<any> => {
    const res = await api.delete(`/orders`, { data: { ids } });
    return res.data.message;
  },
  importFile: async (
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) => {
    const res = await api.post("/orders/importFile", formData, {
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
  exportFile: async (selectedOrders: any[]) => {
    const res = await api.post(
      "/exports/order/bulk",
      { ids: selectedOrders.map((o) => o._id) },
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
  exportFileList: async (
    selectedOrders: any[],
    isSelectedAll: boolean,
    status: string,
  ) => {
    const res = await api.post(
      "/orders/exportFile/bulk",
      {
        ids: selectedOrders.map((o) => o._id),
        isSelectedAll,
        status,
      },
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
  exportFileListTravelog: async () => {
    const res = await api.post(
      "/orders/exportFile/no_travelog",
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

export default OrderService;
