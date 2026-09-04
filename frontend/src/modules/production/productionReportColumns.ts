import type { ProductionReportRow } from "./productionService";

/**
 * Định nghĩa cột của màn Báo cáo thống kê, gom theo NHÓM.
 *
 * Sheet `tinh toan` gốc có 206 cột đặt cạnh nhau không phân nhóm — đọc rất
 * dễ lạc. Ở đây gom thành 7 nhóm theo đúng trình tự nghiệp vụ: thông tin
 * chuyến → khoá gộp → thống kê → trắc địa → kết quả cuối → vết tính toán →
 * nhiên liệu & năng suất.
 *
 * Dùng chung cho cả bảng trên màn hình và file Excel xuất ra, để hai bên
 * không bao giờ lệch nhau về thứ tự hay nhãn cột.
 */
export interface ReportColumn {
  key: keyof ProductionReportRow;
  label: string;
  /** Cột số: căn phải và định dạng theo `scale`. */
  numeric?: boolean;
  scale?: number;
  width: string;
}

export interface ReportColumnGroup {
  title: string;
  /** Mã màu nhóm (hex) — dùng cho dải tiêu đề, chú giải màu, và tô nền cột qua CSS color-mix(). */
  color: string;
  columns: ReportColumn[];
}

export const REPORT_COLUMN_GROUPS: ReportColumnGroup[] = [
  {
    title: "Thông tin chuyến",
    color: "#2f80ed",
    columns: [
      { key: "productionDate", label: "Ngày", width: "min-w-[110px]" },
      { key: "shiftName", label: "Ca", width: "min-w-[80px]" },
      { key: "vehicleCode", label: "Số xe", width: "min-w-[90px]" },
      { key: "excavatorCode", label: "Máy xúc", width: "min-w-[100px]" },
      { key: "excavationAreaName", label: "Khu vực xúc", width: "min-w-[130px]" },
      { key: "loadingPointName", label: "Nơi nhận tải", width: "min-w-[130px]" },
      { key: "unloadingPointName", label: "Nơi dỡ tải", width: "min-w-[130px]" },
      { key: "cargoTypeName", label: "Chủng loại hàng", width: "min-w-[140px]" },
      { key: "cargoGroupName", label: "Nhóm hàng", width: "min-w-[120px]" },
      { key: "tripCount", label: "Số chuyến", numeric: true, scale: 0, width: "min-w-[100px]" },
      { key: "routeDistanceKm", label: "Cung độ (km)", numeric: true, scale: 3, width: "min-w-[120px]" },
    ],
  },
  {
    title: "Khoá gộp",
    color: "#6366f1",
    columns: [
      { key: "seamGroupExcavatorKey", label: "Nhóm vỉa + Máy xúc", width: "min-w-[240px]" },
      { key: "acceptanceProduct", label: "Sản phẩm nghiệm thu", width: "min-w-[160px]" },
      { key: "cargoCode", label: "Mã hoá hàng", width: "min-w-[130px]" },
      { key: "cargoTtlCode", label: "Mã hàng TTL", width: "min-w-[130px]" },
      { key: "seamKpmb", label: "Vỉa KPMB", width: "min-w-[110px]" },
    ],
  },
  {
    title: "Thống kê (chưa áp hệ số)",
    color: "#f59e0b",
    columns: [
      { key: "totalM3", label: "Tổng m3", numeric: true, scale: 3, width: "min-w-[120px]" },
      { key: "totalTon", label: "Tổng KLVC (tấn)", numeric: true, scale: 3, width: "min-w-[140px]" },
      { key: "totalTkm", label: "Tổng Tkm", numeric: true, scale: 4, width: "min-w-[130px]" },
    ],
  },
  {
    title: "Trắc địa (đã áp hệ số m3)",
    color: "#0891b2",
    columns: [
      { key: "surveyM3", label: "m3 trắc địa", numeric: true, scale: 3, width: "min-w-[130px]" },
      { key: "surveyTon", label: "tấn trắc địa", numeric: true, scale: 3, width: "min-w-[130px]" },
      { key: "surveyTkm", label: "tkm trắc địa", numeric: true, scale: 4, width: "min-w-[130px]" },
    ],
  },
  {
    title: "Kết quả cuối",
    color: "#16a34a",
    columns: [
      { key: "finalTon", label: "Tấn cuối cùng", numeric: true, scale: 3, width: "min-w-[140px]" },
      { key: "finalTkm", label: "Tkm cuối cùng", numeric: true, scale: 4, width: "min-w-[140px]" },
    ],
  },
  {
    title: "Vết tính toán",
    color: "#e11d48",
    columns: [
      { key: "modelUsed", label: "Mô hình đã dùng", numeric: true, scale: 3, width: "min-w-[140px]" },
      { key: "densityUsed", label: "Tỷ trọng đã dùng", numeric: true, scale: 3, width: "min-w-[150px]" },
      { key: "bulkDensityUsed", label: "Thể trọng (TĐ)", numeric: true, scale: 3, width: "min-w-[140px]" },
      { key: "hsM3", label: "HS m3", numeric: true, scale: 6, width: "min-w-[120px]" },
      { key: "hsTon", label: "HS tấn", numeric: true, scale: 6, width: "min-w-[120px]" },
      { key: "hsTkm", label: "HS tkm", numeric: true, scale: 6, width: "min-w-[120px]" },
    ],
  },
  {
    title: "TKE ban đầu / không quy ẩm",
    color: "#0d9488",
    columns: [
      { key: "totalM3Original", label: "Tổng KLVC TKE (m3) ban đầu", numeric: true, scale: 3, width: "min-w-[200px]" },
      { key: "densityNoMoisture", label: "Tỷ trọng (không quy ẩm)", numeric: true, scale: 3, width: "min-w-[180px]" },
      { key: "totalTonNoMoisture", label: "Tổng KLVC TKE (tấn, koQA)", numeric: true, scale: 5, width: "min-w-[200px]" },
      { key: "totalTkmNoMoisture", label: "Tổng TKE (tkm, koQA)", numeric: true, scale: 3, width: "min-w-[180px]" },
      { key: "densityOriginal", label: "Tỷ trọng ban đầu", numeric: true, scale: 3, width: "min-w-[150px]" },
    ],
  },
  {
    title: "Nhiên liệu & năng suất",
    color: "#7c3aed",
    columns: [
      { key: "fuelNorm", label: "ĐMNL xe", numeric: true, scale: 4, width: "min-w-[120px]" },
      { key: "fuelBaseConsumption", label: "NL theo ĐM (lít)", numeric: true, scale: 4, width: "min-w-[150px]" },
      { key: "fuelTotalBeforeAdjustment", label: "ĐMNL xe (QĐ 1828)", numeric: true, scale: 4, width: "min-w-[160px]" },
      { key: "fuelCurrentNorm", label: "NLĐM hiện hành", numeric: true, scale: 4, width: "min-w-[150px]" },
      { key: "productivityNorm", label: "ĐM năng suất (ch/ca)", numeric: true, scale: 2, width: "min-w-[170px]" },
    ],
  },
];

export const ALL_REPORT_COLUMNS: ReportColumn[] =
  REPORT_COLUMN_GROUPS.flatMap((g) => g.columns);

/**
 * Số cột đầu được ĐÓNG BĂNG khi cuộn ngang.
 *
 * Bảng rộng gần 30 cột; không giữ lại ngày và số xe thì cuộn một đoạn là mất
 * dấu đang đọc dòng của ai.
 */
export const FROZEN_COLUMN_COUNT = 3;

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
