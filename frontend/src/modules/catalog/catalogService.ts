import api from "@/config/api.config";
import { parsePaginatedResponse, type PaginatedResponse } from "@/types";

/**
 * Service CRUD dùng chung cho MỌI danh mục.
 *
 * Năm danh mục (Khu vực xúc, Nơi nhận tải, Nơi dỡ tải, Nơi chất tải, Chủng
 * loại hàng) có hợp đồng API giống hệt nhau ở backend, nên không chép 5 lần
 * mà truyền `basePath` vào.
 */
const cleanParams = (params?: Record<string, unknown>) => {
  if (!params) return undefined;
  const cleaned: Record<string, unknown> = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== "") cleaned[key] = val;
  });
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

/** Bóc phần `data` của ApiResponse — backend trả {status, success, data}. */
const unwrap = <T,>(res: { data?: { data?: T; result?: T } }): T =>
  (res.data?.data ?? res.data?.result) as T;

export function createCatalogService<T extends { id?: number }>(
  basePath: string,
) {
  return {
    getAll: async (
      params?: Record<string, unknown>,
    ): Promise<PaginatedResponse<T>> => {
      const res = await api.get(basePath, { params: cleanParams(params) });
      return parsePaginatedResponse<T>(res);
    },

    getById: async (id: number | string): Promise<T> =>
      unwrap<T>(await api.get(`${basePath}/${id}`)),

    create: async (payload: Partial<T>): Promise<T> =>
      unwrap<T>(await api.post(basePath, payload)),

    /** Thêm nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    bulkCreate: async (payloads: Partial<T>[]): Promise<T[]> =>
      unwrap<T[]>(await api.post(`${basePath}/bulk`, payloads)),

    update: async (id: number, payload: Partial<T>): Promise<T> =>
      unwrap<T>(await api.put(`${basePath}/${id}`, payload)),

    remove: async (id: number): Promise<void> => {
      await api.delete(`${basePath}/${id}`);
    },

    bulkRemove: async (ids: number[]): Promise<void> => {
      await api.delete(`${basePath}/bulk`, { data: { ids } });
    },

    /** Lấy danh sách giá trị cho combobox (vd /seam-groups, /ttl-clh). */
    options: async (suffix: string): Promise<string[]> =>
      unwrap<string[]>(await api.get(`${basePath}/${suffix}`)) ?? [],
  };
}

export type CatalogService<T extends { id?: number }> = ReturnType<
  typeof createCatalogService<T>
>;
