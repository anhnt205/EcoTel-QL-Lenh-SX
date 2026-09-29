import * as XLSX from "xlsx";
import type { MatrixCellUpsert, MatrixGrid } from "./matrixService";

/**
 * Xuất/nhập Excel cho danh mục dạng lưới.
 *
 * File giữ nguyên hình dạng lưới (dòng × cột) thay vì duỗi thành ba cột
 * rowKey/colKey/value: người dùng đang có sẵn bảng ở đúng hình dạng này
 * trong workbook gốc, dán thẳng vào là chạy.
 */

/** Ô trống trong Excel = chưa khai báo. Chuỗi rỗng chứ không phải số 0. */
export const cellText = (grid: MatrixGrid, rowKey: string, colKey: string): string => {
  const v = grid.cells[rowKey]?.[colKey];
  return v === undefined || v === null ? "" : String(v);
};

export function downloadMatrixExcel(grid: MatrixGrid): void {
  const header = [grid.rowAxisLabel, ...grid.cols.map((c) => c.label)];
  const body = grid.rows.map((r) => [
    r.label,
    ...grid.cols.map((c) => cellText(grid, r.key, c.key)),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet["!cols"] = header.map((h, i) => ({
    wch: i === 0 ? Math.max(h.length + 4, 24) : Math.max(h.length + 2, 12),
  }));
  // Đóng băng dòng tiêu đề và cột khoá — lưới rộng vài chục cột, cuộn một
  // đoạn là mất dấu đang ở dòng nào.
  sheet["!freeze"] = { xSplit: 1, ySplit: 1 };

  const guide = XLSX.utils.aoa_to_sheet([
    [`HƯỚNG DẪN NHẬP LƯỚI ${grid.name.toUpperCase()}`],
    [],
    ["Dòng", grid.rowAxisLabel],
    ["Cột", grid.colAxisLabel],
    ["Giá trị ô", grid.valueLabel],
    [],
    ["Lưu ý:"],
    ["- Giữ nguyên ô A1 và dòng tiêu đề; tên dòng/cột phải khớp danh mục."],
    ["- Chỉ dòng và cột ĐÃ CÓ trong lưới mới được nhận; thêm mới bằng nút Thêm dòng / Thêm cột."],
    ["- Ô để TRỐNG nghĩa là chưa khai báo, KHÁC với ô ghi số 0."],
    ["- Ô đang có giá trị mà xoá trắng trong file thì khi nhập sẽ bị xoá khỏi lưới."],
  ]);
  guide["!cols"] = [{ wch: 14 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Luoi");
  XLSX.utils.book_append_sheet(wb, guide, "HuongDan");
  XLSX.writeFile(wb, `${grid.code.toLowerCase()}.xlsx`);
}

export interface ParsedMatrix {
  cells: MatrixCellUpsert[];
  errors: string[];
}

/**
 * Đọc mảng dòng (đã đọc sẵn từ sheet) thành danh sách ô cần ghi.
 *
 * Đối chiếu theo NHÃN hiển thị (đúng thứ người dùng nhìn thấy trong file),
 * rồi quy về khoá. Nhãn không khớp thì báo rõ tên dòng/cột thay vì bỏ qua
 * lặng lẽ — bỏ qua sẽ khiến người dùng tưởng đã nhập xong.
 *
 * Tách riêng khỏi việc đọc file để nơi khác (vd import DMNL — có thêm một
 * cột nhãn phụ đứng trước cần cắt bỏ trước khi tới đây) có thể tự tiền xử
 * lý mảng dòng rồi tái dùng đúng logic đối chiếu này, không phải chép lại.
 */
export function parseMatrixRows(grid: MatrixGrid, rows: unknown[][], sheetName = "Luoi"): ParsedMatrix {
  const cells: MatrixCellUpsert[] = [];
  const errors: string[] = [];

  if (rows.length < 2) {
    return { cells, errors: [`Sheet "${sheetName}" không có dòng dữ liệu nào.`] };
  }

  const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const rowByLabel = new Map(grid.rows.map((r) => [norm(r.label), r.key]));
  const colByLabel = new Map(grid.cols.map((c) => [norm(c.label), c.key]));

  // Dòng đầu là tiêu đề: ô A1 bỏ qua, các ô còn lại là nhãn cột.
  const header = rows[0];
  const colKeys: (string | null)[] = [];
  for (let i = 1; i < header.length; i++) {
    const label = norm(header[i]);
    if (!label) {
      colKeys.push(null);
      continue;
    }
    const key = colByLabel.get(label);
    if (!key) {
      errors.push(`Cột "${String(header[i])}" không có trong lưới.`);
      colKeys.push(null);
    } else {
      colKeys.push(key);
    }
  }

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const rowLabel = norm(line[0]);
    if (!rowLabel) continue;

    const rowKey = rowByLabel.get(rowLabel);
    if (!rowKey) {
      errors.push(`Dòng ${r + 1}: "${String(line[0])}" không có trong lưới.`);
      continue;
    }

    for (let i = 1; i < line.length; i++) {
      const colKey = colKeys[i - 1];
      if (!colKey) continue;

      const raw = String(line[i] ?? "").trim();
      if (raw === "") {
        // Chỉ gửi lệnh xoá khi ô ĐANG có giá trị, để không tạo ra hàng nghìn
        // thao tác vô nghĩa cho phần lưới vốn đã trống.
        if (grid.cells[rowKey]?.[colKey] !== undefined) {
          cells.push({ rowKey, colKey, value: null });
        }
        continue;
      }

      const num = Number(raw.replace(",", "."));
      if (Number.isNaN(num)) {
        errors.push(`Dòng ${r + 1}, cột "${String(header[i])}": "${raw}" không phải số.`);
        continue;
      }
      cells.push({ rowKey, colKey, value: num });
    }
  }

  return { cells, errors };
}

/** Đọc file lưới thành danh sách ô cần ghi — xem `parseMatrixRows`. */
export async function parseMatrixExcel(grid: MatrixGrid, file: File): Promise<ParsedMatrix> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = wb.SheetNames.includes("Luoi") ? "Luoi" : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    blankrows: false,
  });
  return parseMatrixRows(grid, rows, sheetName);
}
