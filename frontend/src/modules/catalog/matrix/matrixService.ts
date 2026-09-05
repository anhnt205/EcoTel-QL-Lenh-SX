import api from "@/config/api.config";

/** Một dòng hoặc một cột của lưới. */
export interface MatrixAxisEntry {
  key: string;
  label: string;
  numericValue?: number | null;
  sortOrder: number;
}

export interface MatrixGrid {
  /** Id của PHIÊN BẢN đang xem — phải gửi kèm khi sửa. */
  versionId: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  versionLabel: string | null;
  code: string;
  name: string;
  rowAxisLabel: string;
  colAxisLabel: string;
  valueLabel: string;
  rowSourcePath?: string | null;
  colSourcePath?: string | null;
  numericRowAxis: boolean;
  numericColAxis: boolean;
  valueScale: number;
  note?: string | null;
  rows: MatrixAxisEntry[];
  cols: MatrixAxisEntry[];
  /**
   * rowKey -> colKey -> giá trị.
   *
   * Ô chưa khai báo thì KHÔNG có khoá — khác với ô bằng 0. Đừng thay bằng
   * `?? 0` ở bất kỳ đâu, vì "chưa khai báo" là tín hiệu để công thức báo
   * thiếu dữ liệu thay vì âm thầm tính ra 0.
   */
  cells: Record<string, Record<string, number>>;
}

export interface MatrixCellUpsert {
  rowKey: string;
  colKey: string;
  /** null = xoá ô, trả về trạng thái chưa khai báo. */
  value: number | null;
}

export interface MatrixAxisEntryInput {
  key: string;
  label?: string;
  numericValue?: number | null;
  sortOrder?: number;
}

const BASE = "/matrix-catalogs";

const unwrap = <T,>(res: { data?: { data?: T } }): T => res.data?.data as T;

export const matrixService = {
  list: async (): Promise<MatrixGrid[]> => unwrap(await api.get(BASE)) ?? [],

  /** Bỏ trống `versionId` thì lấy phiên bản mới nhất. */
  getGrid: async (code: string, versionId?: number): Promise<MatrixGrid> =>
    unwrap(await api.get(`${BASE}/${code}`, { params: versionId ? { versionId } : undefined })),

  versions: async (code: string): Promise<MatrixGrid[]> =>
    unwrap(await api.get(`${BASE}/${code}/versions`)) ?? [],

  createVersion: async (code: string, body: {
    sourceId?: number; effectiveFrom: string; effectiveTo?: string | null;
    versionLabel?: string; note?: string; copyCells: boolean;
  }): Promise<MatrixGrid> =>
    unwrap(await api.post(`${BASE}/${code}/versions`, body)),

  /**
   * Sửa siêu dữ liệu (ngày hiệu lực, nhãn, mô tả) của một phiên bản đã có —
   * không đụng trục hay ô.
   */
  updateVersion: async (code: string, versionId: number, body: {
    effectiveFrom: string; effectiveTo?: string | null;
    versionLabel?: string; note?: string;
  }): Promise<MatrixGrid> =>
    unwrap(await api.put(`${BASE}/${code}/versions/${versionId}`, body)),

  /** Xoá phiên bản; phiên bản cuối cùng của lưới thì máy chủ từ chối. */
  deleteVersion: async (code: string, versionId: number): Promise<void> => {
    await api.delete(`${BASE}/${code}/versions/${versionId}`);
  },

  // Mọi thao tác SỬA đều gửi kèm versionId: mở phiên bản tháng trước để đối
  // chiếu rồi lỡ sửa một ô thì phải ghi vào ĐÚNG phiên bản đó, không phải
  // phiên bản hiện hành.
  saveCells: async (code: string, versionId: number, cells: MatrixCellUpsert[]): Promise<number> => {
    const res = await api.put(`${BASE}/${code}/cells`, cells, { params: { versionId } });
    return unwrap<{ affected: number }>(res)?.affected ?? 0;
  },

  addRows: async (code: string, versionId: number, rows: MatrixAxisEntryInput[]): Promise<MatrixGrid> =>
    unwrap(await api.post(`${BASE}/${code}/rows`, rows, { params: { versionId } })),

  addCols: async (code: string, versionId: number, cols: MatrixAxisEntryInput[]): Promise<MatrixGrid> =>
    unwrap(await api.post(`${BASE}/${code}/cols`, cols, { params: { versionId } })),

  removeRow: async (code: string, versionId: number, key: string): Promise<MatrixGrid> =>
    unwrap(await api.delete(`${BASE}/${code}/rows`, { params: { key, versionId } })),

  removeCol: async (code: string, versionId: number, key: string): Promise<MatrixGrid> =>
    unwrap(await api.delete(`${BASE}/${code}/cols`, { params: { key, versionId } })),
};
