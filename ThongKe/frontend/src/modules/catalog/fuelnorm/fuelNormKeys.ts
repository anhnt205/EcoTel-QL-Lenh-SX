import type { MatrixAxisEntry, MatrixGrid } from "../matrix/matrixService";

/**
 * Suy "bộ định mức theo Chủng loại xe (NL) + Hậu tố" từ quy ước khoá cột đã
 * có của lưới DMNL — KHÔNG phải một trục/bảng riêng ở backend.
 *
 * Khoá cột thật (`ProductionKeys.fuelNormVehicleKey` + `FuelNormInterpolator`
 * ở backend): {@code <mã Chủng loại xe (NL)><hậu tố>_<cung độ>}, vd
 * {@code CAT777E.BK_0,05}.
 *
 * HẬU TỐ Ở ĐÂY KHÔNG PHẢI KHU VỰC (QĐ-11). Trước 07/09/2026 file này ghi
 * hậu tố chỉ có `.CS`/`.KC` — SAI. Gốc của nhầm lẫn:
 * `RA_SOAT_CHUAN_HOA_DANH_MUC.md:375` đặt tiêu đề "Khoá cột lưới Mô hình /
 * DMNL có HẬU TỐ KHU VỰC" nhưng bên dưới chỉ trích công thức của Mô hình.
 * Bằng chứng sống (bảng tính dòng 1250): cùng một xe có `DA=CAT777E.CS`
 * (Mô hình) nhưng `DE=CAT777E.BK` (DMNL) — hai khoá khác nhau.
 *
 * Hậu tố thật do công thức `DE5` tự suy theo chuyến (chủng loại hàng, nơi
 * dỡ tải, SPNT, hạng xe). Người nhập danh mục không tính được điều đó, nên
 * ở đây chỉ liệt kê năm GIÁ TRỊ mà công thức có thể sinh ra, để khai đủ cột.
 *
 * Lưu ý: `.Dat` (nhánh xe cạp) và `.DAT` (nhánh Phân loại) là HAI chuỗi
 * KHÁC NHAU trong bảng tính — không gộp, không đổi hoa thường.
 */

export type FuelNormSuffix = "Bun" | "Dat" | "BK" | "DAT" | "Than";

export const FUEL_NORM_SUFFIXES: { value: FuelNormSuffix; label: string }[] = [
  { value: "DAT", label: ".DAT (Phân loại Đất)" },
  { value: "Than", label: ".Than (Phân loại Than)" },
  { value: "BK", label: ".BK (dỡ băng tải / SPNT vỉa)" },
  { value: "Dat", label: ".Dat (xe cạp chở đất)" },
  { value: "Bun", label: ".Bun (HM400-2R hạng C chở bùn)" },
];

export const vehicleSuffixKeyOf = (vehicleCode: string, suffix: FuelNormSuffix): string =>
  `${vehicleCode}.${suffix}`;

/**
 * Tách `<mã xe><hậu tố>`.
 *
 * Thử hậu tố DÀI trước để `.Than` không bị `.DAT`/`.Dat` cắt nhầm, và so
 * PHÂN BIỆT hoa thường vì `.Dat` ≠ `.DAT`.
 */
const SUFFIXES_LONGEST_FIRST: FuelNormSuffix[] = ["Than", "DAT", "Dat", "Bun", "BK"];

export function parseVehicleSuffixKey(
  key: string,
): { vehicleCode: string; suffix: FuelNormSuffix } | null {
  for (const suffix of SUFFIXES_LONGEST_FIRST) {
    const tail = `.${suffix}`;
    if (key.endsWith(tail)) {
      return { vehicleCode: key.slice(0, -tail.length), suffix };
    }
  }
  return null;
}

/** Tách khoá cột tại dấu `_` CUỐI CÙNG — mirror `FuelNormInterpolator.distanceBandsOf`. */
export function parseColumnKey(
  colKey: string,
): { vehicleSuffixKey: string; distance: number } | null {
  const idx = colKey.lastIndexOf("_");
  if (idx < 0) return null;
  const vehicleSuffixKey = colKey.slice(0, idx);
  const distance = Number(colKey.slice(idx + 1).replace(",", "."));
  if (Number.isNaN(distance)) return null;
  return { vehicleSuffixKey, distance };
}

/** Ghép khoá cột mới — mirror `FuelNormInterpolator.columnKey`. */
export const buildColumnKey = (vehicleSuffixKey: string, distance: number): string =>
  `${vehicleSuffixKey}_${distance}`;

export interface FuelNormDataset {
  vehicleSuffixKey: string;
  vehicleCode: string;
  suffix: FuelNormSuffix;
  /** Cột của riêng bộ dữ liệu này, đã sắp theo cung độ tăng dần. */
  columns: (MatrixAxisEntry & { distance: number })[];
}

/** Nhóm cột của lưới theo tiền tố Chủng loại xe + Hậu tố, sắp theo mã xe rồi hậu tố. */
export function groupColumnsByVehicleSuffix(grid: MatrixGrid): FuelNormDataset[] {
  const byKey = new Map<string, FuelNormDataset>();
  for (const col of grid.cols) {
    const parsed = parseColumnKey(col.key);
    if (!parsed) continue;
    const vs = parseVehicleSuffixKey(parsed.vehicleSuffixKey);
    if (!vs) continue;
    let ds = byKey.get(parsed.vehicleSuffixKey);
    if (!ds) {
      ds = { vehicleSuffixKey: parsed.vehicleSuffixKey, vehicleCode: vs.vehicleCode, suffix: vs.suffix, columns: [] };
      byKey.set(parsed.vehicleSuffixKey, ds);
    }
    ds.columns.push({ ...col, distance: parsed.distance });
  }
  const list = Array.from(byKey.values());
  list.forEach((ds) => ds.columns.sort((a, b) => a.distance - b.distance));
  list.sort((a, b) => a.vehicleCode.localeCompare(b.vehicleCode) || a.suffix.localeCompare(b.suffix));
  return list;
}

// ── Nội suy song tuyến — CHỈ để xem trước trên UI, KHÔNG phải nguồn tính
// chính thức. Nguồn thật vẫn là FuelNormInterpolator.java (backend), engine
// sản lượng gọi thẳng lớp đó. Hàm dưới đây là bản port TypeScript của đúng
// thuật toán, dùng riêng cho panel xem trước ở màn Quản lý.

export interface InterpolationResult {
  value: number;
  distanceLow: number | null;
  distanceHigh: number | null;
  slopeLow: number | null;
  slopeHigh: number | null;
}

function floorOf(axis: number[], value: number): number | null {
  let best: number | null = null;
  for (const v of axis) if (v <= value) best = v;
  return best;
}

function ceilOf(axis: number[], value: number): number | null {
  for (const v of axis) if (v >= value) return v;
  return null;
}

function linear(
  x: number,
  x0: number | null,
  x1: number | null,
  y0: number | null,
  y1: number | null,
): number | null {
  if (x0 === null || x1 === null || y0 === null) return y0;
  if (x0 === x1) return y0;
  const ratio = (x - x0) / (x1 - x0);
  return y0 + ((y1 ?? y0) - y0) * ratio;
}

function distanceBandsOf(grid: MatrixGrid, vehicleSuffixKey: string): number[] {
  const prefix = `${vehicleSuffixKey}_`;
  const out: number[] = [];
  for (const col of grid.cols) {
    if (!col.key.startsWith(prefix)) continue;
    const v = Number(col.key.slice(prefix.length).replace(",", "."));
    if (!Number.isNaN(v)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

function slopeBandsOf(grid: MatrixGrid): number[] {
  return grid.rows
    .map((r) => r.numericValue)
    .filter((v): v is number => v !== null && v !== undefined)
    .sort((a, b) => a - b);
}

function cellAtSlope(grid: MatrixGrid, slopeBand: number | null, colKey: string): number | null {
  if (slopeBand === null) return null;
  const row = grid.rows.find((r) => r.numericValue !== null && r.numericValue === slopeBand);
  if (!row) return null;
  const value = grid.cells[row.key]?.[colKey];
  return value === undefined ? null : value;
}

function interpolateOverSlope(
  grid: MatrixGrid,
  vehicleSuffixKey: string,
  distanceBand: number | null,
  h1: number | null,
  h2: number | null,
  slope: number,
): number | null {
  if (distanceBand === null) return null;
  const colKey = buildColumnKey(vehicleSuffixKey, distanceBand);
  const at = cellAtSlope(grid, h1, colKey);
  const au = cellAtSlope(grid, h2, colKey);
  if (at === null && au === null) return null;
  if (at === null) return au;
  if (au === null) return at;
  return linear(slope, h1, h2, at, au);
}

/** Nội suy song tuyến trên 4 góc — xem trước, không phải nguồn tính chính thức. */
export function interpolateBilinear(
  grid: MatrixGrid,
  vehicleSuffixKey: string,
  routeDistance: number,
  slope: number,
): InterpolationResult | null {
  if (routeDistance === 0) {
    return { value: 0, distanceLow: null, distanceHigh: null, slopeLow: null, slopeHigh: null };
  }

  const distances = distanceBandsOf(grid, vehicleSuffixKey);
  if (distances.length === 0) return null;

  let hb = floorOf(distances, routeDistance);
  let ha = ceilOf(distances, routeDistance);
  if (hb === null) hb = ha;
  if (ha === null) ha = hb;

  const slopes = slopeBandsOf(grid);
  if (slopes.length === 0) return null;

  let h1 = floorOf(slopes, slope);
  let h2 = ceilOf(slopes, slope);
  if (h1 === null) h1 = h2;
  if (h2 === null) h2 = h1;

  let av = interpolateOverSlope(grid, vehicleSuffixKey, hb, h1, h2, slope);
  let ay = interpolateOverSlope(grid, vehicleSuffixKey, ha, h1, h2, slope);
  if (av === null && ay === null) return null;
  if (av === null) av = ay;
  if (ay === null) ay = av;

  const value = linear(routeDistance, hb, ha, av, ay);
  if (value === null) return null;
  return { value, distanceLow: hb, distanceHigh: ha, slopeLow: h1, slopeHigh: h2 };
}

// ── Trạng thái + mã hiển thị ────────────────────────────────────────────────

export type FuelNormStatus = "upcoming" | "active" | "expired";

export function statusOf(effectiveFrom: string | null, effectiveTo: string | null): FuelNormStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (effectiveFrom && effectiveFrom > today) return "upcoming";
  if (effectiveTo && effectiveTo < today) return "expired";
  return "active";
}

export const STATUS_LABEL: Record<FuelNormStatus, string> = {
  upcoming: "Sắp áp dụng",
  active: "Đang áp dụng",
  expired: "Hết hiệu lực",
};

/** Mã hiển thị — CHỈ để hiển thị, không lưu ở backend. */
export function deriveDisplayCode(vehicleCode: string, suffix: FuelNormSuffix, effectiveFrom: string | null): string {
  const year = effectiveFrom ? effectiveFrom.slice(0, 4) : "?";
  return `DMNL-${year}-${vehicleCode}-${suffix}`;
}
