import type { ProductionReportRow } from "./productionService";

/**
 * Định nghĩa cột của màn Báo cáo thống kê — xếp ĐÚNG THỨ TỰ cột của sheet `tinh toan` (Excel),
 * không chia nhóm (chủ dự án chốt 2026-11-04). Thứ tự = thứ tự chữ cái cột `excel` của từng cột
 * (B, C, D, E, G, I, J, K, L, Q, R, S, AC, AG, …); bảng đối chiếu cột ↔ Excel nằm ở
 * `docs/DOI_CHIEU_COT_EXCEL.md`.
 *
 * Dùng chung cho cả bảng trên màn hình và file Excel xuất ra, để hai bên không bao giờ lệch nhau
 * về thứ tự hay nhãn cột.
 */
export interface ReportColumn {
  key: keyof ProductionReportRow;
  label: string;
  /** Chữ cái cột trong sheet `tinh toan` của Excel. */
  excel: string;
  /** Cột số: căn phải và định dạng theo `scale`. */
  numeric?: boolean;
  scale?: number;
  width: string;
}

export const ALL_REPORT_COLUMNS: ReportColumn[] = [
  { key: "productionDate", label: "Ngày", excel: "B", width: "min-w-[110px]" },
  { key: "shiftName", label: "Ca", excel: "C", width: "min-w-[80px]" },
  { key: "excavationAreaName", label: "Khu vực xúc", excel: "D", width: "min-w-[130px]" },
  { key: "excavatorCode", label: "Máy xúc", excel: "E", width: "min-w-[100px]" },
  { key: "loadingPointName", label: "Nơi nhận tải", excel: "G", width: "min-w-[130px]" },
  { key: "unloadingPointName", label: "Nơi dỡ tải", excel: "I", width: "min-w-[130px]" },
  { key: "cargoGroupName", label: "Nhóm hàng", excel: "J", width: "min-w-[120px]" },
  { key: "cargoTypeName", label: "Chủng loại hàng", excel: "K", width: "min-w-[140px]" },
  { key: "routeDistanceKm", label: "Cung độ (km)", excel: "L", numeric: true, scale: 3, width: "min-w-[120px]" },
  { key: "vehicleCode", label: "Số xe", excel: "Q", width: "min-w-[90px]" },
  { key: "tripCount", label: "Số chuyến", excel: "R", numeric: true, scale: 0, width: "min-w-[100px]" },
  { key: "hsM3", label: "HS m3", excel: "S", numeric: true, scale: 6, width: "min-w-[120px]" },
  { key: "bulkDensityUsed", label: "Thể trọng (TĐ)", excel: "AC", numeric: true, scale: 3, width: "min-w-[140px]" },
  { key: "acceptanceProduct", label: "Sản phẩm nghiệm thu", excel: "AG", width: "min-w-[160px]" },
  { key: "densityUsed", label: "Tỷ trọng đã dùng", excel: "AI", numeric: true, scale: 3, width: "min-w-[150px]" },
  { key: "modelUsed", label: "Mô hình đã dùng", excel: "AJ", numeric: true, scale: 3, width: "min-w-[140px]" },
  { key: "totalM3", label: "Tổng m3", excel: "AL", numeric: true, scale: 3, width: "min-w-[120px]" },
  { key: "totalTon", label: "Tổng KLVC (tấn)", excel: "AM", numeric: true, scale: 3, width: "min-w-[140px]" },
  { key: "totalTkm", label: "Tổng Tkm", excel: "AN", numeric: true, scale: 4, width: "min-w-[130px]" },
  { key: "fuelNorm", label: "ĐMNL xe", excel: "BF", numeric: true, scale: 4, width: "min-w-[120px]" },
  { key: "fuelBaseConsumption", label: "NL theo ĐM (lít)", excel: "BG", numeric: true, scale: 4, width: "min-w-[150px]" },
  { key: "fuelTotalBeforeAdjustment", label: "ĐMNL xe (QĐ 1828)", excel: "BP", numeric: true, scale: 4, width: "min-w-[160px]" },
  { key: "fuelCurrentNorm", label: "NLĐM hiện hành", excel: "BQ", numeric: true, scale: 4, width: "min-w-[150px]" },
  { key: "productivityNorm", label: "ĐM năng suất (ch/ca)", excel: "BR", numeric: true, scale: 2, width: "min-w-[170px]" },
  { key: "cargoCode", label: "Mã hoá hàng", excel: "BT", width: "min-w-[130px]" },
  { key: "cargoTtlCode", label: "Mã hàng TTL", excel: "BU", width: "min-w-[130px]" },
  { key: "seamKpmb", label: "Vỉa KPMB", excel: "BV", width: "min-w-[110px]" },
  { key: "densityNoMoisture", label: "Tỷ trọng (không quy ẩm)", excel: "CC", numeric: true, scale: 3, width: "min-w-[180px]" },
  { key: "totalTonNoMoisture", label: "Tổng KLVC TKE (tấn, koQA)", excel: "CD", numeric: true, scale: 5, width: "min-w-[200px]" },
  { key: "totalTkmNoMoisture", label: "Tổng TKE (tkm, koQA)", excel: "CE", numeric: true, scale: 3, width: "min-w-[180px]" },
  { key: "densityOriginal", label: "Tỷ trọng ban đầu", excel: "CF", numeric: true, scale: 3, width: "min-w-[150px]" },
  { key: "totalM3Original", label: "Tổng KLVC TKE (m3) ban đầu", excel: "CG", numeric: true, scale: 3, width: "min-w-[200px]" },
  { key: "seamGroupExcavatorKey", label: "Nhóm vỉa + Máy xúc", excel: "CR", width: "min-w-[240px]" },
  { key: "surveyM3", label: "m3 trắc địa", excel: "DS", numeric: true, scale: 3, width: "min-w-[130px]" },
  { key: "finalTon", label: "Tấn cuối cùng", excel: "DT", numeric: true, scale: 3, width: "min-w-[140px]" },
  { key: "finalTkm", label: "Tkm cuối cùng", excel: "DU", numeric: true, scale: 4, width: "min-w-[140px]" },
  { key: "surveyTon", label: "tấn trắc địa", excel: "DW", numeric: true, scale: 3, width: "min-w-[130px]" },
  { key: "surveyTkm", label: "tkm trắc địa", excel: "DX", numeric: true, scale: 4, width: "min-w-[130px]" },
  { key: "hsTon", label: "HS tấn", excel: "DY", numeric: true, scale: 6, width: "min-w-[120px]" },
  { key: "hsTkm", label: "HS tkm", excel: "DZ", numeric: true, scale: 6, width: "min-w-[120px]" },
];

/** Các cột của nút "Chỉ cột chính" — thông tin chuyến lấy thẳng từ phiếu (như trước khi bỏ nhóm). */
export const MAIN_COLUMN_KEYS: Array<keyof ProductionReportRow> = [
  "productionDate",
  "shiftName",
  "vehicleCode",
  "excavatorCode",
  "excavationAreaName",
  "loadingPointName",
  "unloadingPointName",
  "cargoTypeName",
  "cargoGroupName",
  "tripCount",
  "routeDistanceKm",
];

/**
 * Số cột đầu được ĐÓNG BĂNG khi cuộn ngang (ngoài cột "Mã dòng").
 *
 * Bảng rộng hơn 40 cột; không giữ lại ngày và ca thì cuộn một đoạn là mất dấu đang đọc dòng nào.
 */
export const FROZEN_COLUMN_COUNT = 2;

/** Hiển thị một ô: số thì căn phải và cố định số chữ số thập phân. */
export function formatCell(value: unknown, col: ReportColumn): string {
  if (value === null || value === undefined || value === "") return "";
  if (!col.numeric) return String(value);
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: col.scale ?? 0,
    maximumFractionDigits: col.scale ?? 0,
  });
}

/**
 * Phân loại Đất/Than của một dòng — dùng cho bộ lọc "Phân loại" trên màn
 * Báo cáo thống kê. Chép LẠI đúng quy tắc backend
 * (`ProductionKeys.classify` — cột AD của bảng tính gốc: chữ cái ĐẦU của
 * Sản phẩm nghiệm thu là S hoặc D thì ĐẤT, còn lại là THAN), không suy diễn
 * quy tắc mới — chỉ để lọc hiển thị, không dùng để tính toán.
 */
export function classifyEarthCoal(acceptanceProduct: string | null): "Đất" | "Than" {
  const first = (acceptanceProduct ?? "").trim().charAt(0).toUpperCase();
  return first === "S" || first === "D" ? "Đất" : "Than";
}
