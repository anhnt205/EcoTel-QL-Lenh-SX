import api from "@/config/api.config";

/** Một dòng hoặc một cột của lưới. */
export interface MatrixAxisEntry {
  key: string;
  label: string;
  numericValue?: number | null;
  sortOrder: number;
}

export interface MatrixGrid {
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

  getGrid: async (code: string): Promise<MatrixGrid> =>
    unwrap(await api.get(`${BASE}/${code}`)),

  saveCells: async (code: string, cells: MatrixCellUpsert[]): Promise<number> => {
    const res = await api.put(`${BASE}/${code}/cells`, cells);
    return unwrap<{ affected: number }>(res)?.affected ?? 0;
  },

  addRows: async (code: string, rows: MatrixAxisEntryInput[]): Promise<MatrixGrid> =>
    unwrap(await api.post(`${BASE}/${code}/rows`, rows)),

  addCols: async (code: string, cols: MatrixAxisEntryInput[]): Promise<MatrixGrid> =>
    unwrap(await api.post(`${BASE}/${code}/cols`, cols)),

  removeRow: async (code: string, key: string): Promise<MatrixGrid> =>
    unwrap(await api.delete(`${BASE}/${code}/rows`, { params: { key } })),

  removeCol: async (code: string, key: string): Promise<MatrixGrid> =>
    unwrap(await api.delete(`${BASE}/${code}/cols`, { params: { key } })),
};
