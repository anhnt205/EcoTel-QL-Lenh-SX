import * as XLSX from "xlsx";
import { matrixService, type MatrixGrid } from "../matrix/matrixService";
import { parseMatrixExcel } from "../matrix/matrixExcel";
import { parseColumnKey, parseVehicleSuffixKey } from "./fuelNormKeys";

/**
 * Import Excel riêng cho DMNL: tiêu đề cột đã ĐÚNG là khoá cột thật
 * (vd {@code HD785-7.CS_0,05}), nên có thể tự phát hiện chủng loại xe/hậu
 * tố/cung độ CHƯA có trong lưới và tự tạo trục trước khi ghi giá trị —
 * khác với `matrixExcel.ts` (chỉ nhận đúng nhãn ĐÃ khai báo sẵn).
 *
 * Giá trị ô vẫn ghi qua đúng `parseMatrixExcel` + `matrixService.saveCells`
 * sẵn có — không viết lại phần đó.
 */

interface ScanResult {
  missingRows: { key: string; label: string }[];
  missingCols: { key: string; label: string }[];
  vehicleSuffixKeys: Set<string>;
  warnings: string[];
  dataColCount: number;
  dataRowCount: number;
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

async function readSheetRows(file: File): Promise<unknown[][]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = wb.SheetNames.includes("Luoi") ? "Luoi" : wb.SheetNames[0];
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, blankrows: false });
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
  const rows = await readSheetRows(file);
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
  const rows = await readSheetRows(file);
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

  const { cells, errors } = await parseMatrixExcel(working, file);
  let affected = 0;
  if (cells.length > 0) {
    affected = await matrixService.saveCells(working.code, working.versionId, cells);
  }
  return { affected, errors: [...scan.warnings, ...errors], grid: working };
}
