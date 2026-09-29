import * as XLSX from "xlsx";
import { matrixService, type MatrixGrid } from "../matrix/matrixService";
import { cellText, parseMatrixRows } from "../matrix/matrixExcel";
import { parseColumnKey, parseVehicleSuffixKey } from "./fuelNormKeys";

/**
 * Xuất/nhập Excel riêng cho DMNL.
 *
 * Khác với `matrixExcel.ts` dùng chung (chỉ 1 cột nhãn dòng) ở hai điểm,
 * theo đúng mẫu bảng "DMNL T2-2025" thật của chủ dự án
 * (`docs/REQUIREMENT_SANLUONG_EXCEL.md` — công thức `AP5`/`AQ5` tra thẳng
 * cột A của sheet này làm danh sách cung độ mốc):
 *
 * 1. Tiêu đề cột đã ĐÚNG là khoá cột thật (vd {@code HD785-7.CS_0,05}), nên
 *    có thể tự phát hiện chủng loại xe/hậu tố/cung độ CHƯA có trong lưới và
 *    tự tạo trục trước khi ghi giá trị.
 * 2. File có THÊM một cột "Cung độ" đứng TRƯỚC cột nhãn dòng (Độ dốc) —
 *    đúng cột A của sheet gốc: danh sách mốc cung độ dùng để nội suy, ĐỘC
 *    LẬP với Độ dốc trên cùng dòng (không phải cặp khoá dòng). Cột này chỉ
 *    mang tính tham chiếu cho người xem quen mẫu cũ — khi nhập, bỏ qua
 *    hoàn toàn, dùng cột "Độ dốc" (cột B) làm nhãn dòng thật.
 */

interface ScanResult {
  missingRows: { key: string; label: string }[];
  missingCols: { key: string; label: string }[];
  vehicleSuffixKeys: Set<string>;
  warnings: string[];
  dataColCount: number;
  dataRowCount: number;
}

/**
 * Bỏ cột "Cung độ" tham chiếu đứng đầu nếu có — nhận diện bằng việc ô tiêu
 * đề thứ 2 khớp đúng tên trục dòng thật (`grid.rowAxisLabel`, "Độ dốc").
 * Mẫu cũ (không có cột tham chiếu) thì ô đó là một khoá cột thật, không
 * khớp tên trục dòng, nên không bị cắt nhầm.
 */
function stripReferenceDistanceColumn(grid: MatrixGrid, rows: unknown[][]): unknown[][] {
  const header = rows[0] ?? [];
  const second = String(header[1] ?? "").trim().toLowerCase();
  if (second !== grid.rowAxisLabel.trim().toLowerCase()) return rows;
  return rows.map((line) => line.slice(1));
}

function scanSheet(grid: MatrixGrid, rows: unknown[][]): ScanResult {
  const warnings: string[] = [];
  const vehicleSuffixKeys = new Set<string>();

  const existingColKeys = new Set(grid.cols.map((c) => c.key));
  const existingColLabels = new Set(grid.cols.map((c) => String(c.label).trim().toLowerCase()));
  const missingCols: { key: string; label: string }[] = [];

  const header = rows[0] ?? [];
  let dataColCount = 0;
  for (let i = 1; i < header.length; i++) {
    const label = String(header[i] ?? "").trim();
    if (!label) continue;
    dataColCount++;

    const parsed = parseColumnKey(label);
    if (!parsed) {
      warnings.push(`Cột "${label}": không đọc được dạng "<chủng loại xe>.<CS|KC>_<cung độ>".`);
      continue;
    }
    const vs = parseVehicleSuffixKey(parsed.vehicleSuffixKey);
    if (vs) vehicleSuffixKeys.add(parsed.vehicleSuffixKey);

    if (existingColLabels.has(label.toLowerCase()) || existingColKeys.has(label)) continue;
    if (!missingCols.some((c) => c.key === label)) missingCols.push({ key: label, label });
  }

  const existingRowLabels = new Set(grid.rows.map((r) => String(r.label).trim().toLowerCase()));
  const missingRows: { key: string; label: string }[] = [];
  let dataRowCount = 0;
  for (let r = 1; r < rows.length; r++) {
    const line = rows[r] ?? [];
    const rowLabel = String(line[0] ?? "").trim();
    if (!rowLabel) continue;
    dataRowCount++;
    if (existingRowLabels.has(rowLabel.toLowerCase())) continue;
    if (!missingRows.some((r2) => r2.key === rowLabel)) missingRows.push({ key: rowLabel, label: rowLabel });
  }

  return { missingRows, missingCols, vehicleSuffixKeys, warnings, dataColCount, dataRowCount };
}

async function readSheetRows(grid: MatrixGrid, file: File): Promise<unknown[][]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = wb.SheetNames.includes("Luoi") ? "Luoi" : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, blankrows: false });
  return stripReferenceDistanceColumn(grid, rows);
}

export interface FuelNormImportPreview {
  vehicleCount: number;
  suffixCount: number;
  columnCount: number;
  rowCount: number;
  newColumnCount: number;
  newRowCount: number;
  warnings: string[];
}

export async function previewFuelNormExcel(grid: MatrixGrid, file: File): Promise<FuelNormImportPreview> {
  const rows = await readSheetRows(grid, file);
  if (rows.length < 2) {
    return {
      vehicleCount: 0, suffixCount: 0, columnCount: 0, rowCount: 0,
      newColumnCount: 0, newRowCount: 0, warnings: ["File không có dòng dữ liệu nào."],
    };
  }
  const scan = scanSheet(grid, rows);
  const vehicles = new Set<string>();
  const suffixes = new Set<string>();
  scan.vehicleSuffixKeys.forEach((k) => {
    const vs = parseVehicleSuffixKey(k);
    if (vs) { vehicles.add(vs.vehicleCode); suffixes.add(vs.suffix); }
  });
  return {
    vehicleCount: vehicles.size,
    suffixCount: suffixes.size,
    columnCount: scan.dataColCount,
    rowCount: scan.dataRowCount,
    newColumnCount: scan.missingCols.length,
    newRowCount: scan.missingRows.length,
    warnings: scan.warnings,
  };
}

export interface FuelNormImportResult {
  affected: number;
  errors: string[];
  grid: MatrixGrid;
}

export async function importFuelNormExcel(grid: MatrixGrid, file: File): Promise<FuelNormImportResult> {
  const rows = await readSheetRows(grid, file);
  if (rows.length < 2) {
    return { affected: 0, errors: ["File không có dòng dữ liệu nào."], grid };
  }
  const scan = scanSheet(grid, rows);

  let working = grid;
  if (scan.missingRows.length > 0) {
    working = await matrixService.addRows(working.code, working.versionId, scan.missingRows);
  }
  if (scan.missingCols.length > 0) {
    working = await matrixService.addCols(working.code, working.versionId, scan.missingCols);
  }

  const { cells, errors } = parseMatrixRows(working, rows);
  let affected = 0;
  if (cells.length > 0) {
    affected = await matrixService.saveCells(working.code, working.versionId, cells);
  }
  return { affected, errors: [...scan.warnings, ...errors], grid: working };
}

/**
 * Xuất Excel DMNL theo đúng mẫu bảng "DMNL T2-2025" thật: cột "Cung độ"
 * (danh sách mốc cung độ dùng chung, tách biệt hoàn toàn với Độ dốc) đứng
 * trước cột "Độ dốc" (nhãn dòng thật). Số dòng in ra = số dòng lớn hơn
 * giữa hai danh sách — dòng thừa của danh sách ngắn hơn để trống, đúng
 * hình dạng bảng gốc (hai cột tham chiếu độc lập, không phải cặp khoá).
 */
export function downloadFuelNormExcel(grid: MatrixGrid): void {
  const distances = Array.from(
    new Set(
      grid.cols
        .map((c) => parseColumnKey(c.key)?.distance)
        .filter((d): d is number => d !== undefined && !Number.isNaN(d)),
    ),
  ).sort((a, b) => a - b);

  const header = ["Cung độ", grid.rowAxisLabel, ...grid.cols.map((c) => c.label)];
  const rowCount = Math.max(distances.length, grid.rows.length);
  const body: (string | number)[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const row = grid.rows[i];
    body.push([
      distances[i] ?? "",
      row ? row.label : "",
      ...(row ? grid.cols.map((c) => cellText(grid, row.key, c.key)) : grid.cols.map(() => "")),
    ]);
  }

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet["!cols"] = header.map((h, i) => ({
    wch: i < 2 ? Math.max(String(h).length + 4, 14) : Math.max(String(h).length + 2, 12),
  }));
  sheet["!freeze"] = { xSplit: 2, ySplit: 1 };

  const guide = XLSX.utils.aoa_to_sheet([
    [`HƯỚNG DẪN NHẬP ${grid.name.toUpperCase()}`],
    [],
    ["Cung độ", "Danh sách mốc cung độ dùng chung — chỉ để tham chiếu, KHÔNG nhập lại khi import."],
    ["Độ dốc", "Nhãn dòng thật — đối chiếu theo cột này khi nhập."],
    ["Cột dữ liệu", "Dạng <chủng loại xe>.<CS|KC>_<cung độ>, vd HD785-7.CS_0,05."],
    ["Giá trị ô", grid.valueLabel],
    [],
    ["Lưu ý:"],
    ["- Giữ nguyên dòng tiêu đề; cột \"Cung độ\" có hay không đều nhập được."],
    ["- Chủng loại xe/hậu tố/cung độ CHƯA có trong lưới sẽ tự được tạo khi import."],
    ["- Ô để TRỐNG nghĩa là chưa khai báo, KHÁC với ô ghi số 0."],
    ["- Ô đang có giá trị mà xoá trắng trong file thì khi nhập sẽ bị xoá khỏi lưới."],
  ]);
  guide["!cols"] = [{ wch: 14 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Luoi");
  XLSX.utils.book_append_sheet(wb, guide, "HuongDan");
  XLSX.writeFile(wb, `${grid.code.toLowerCase()}.xlsx`);
}
