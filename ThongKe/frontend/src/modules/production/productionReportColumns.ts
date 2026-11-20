import type { ProductionReportRow } from "./productionService";

/**
 * Định nghĩa cột của màn Báo cáo thống kê — xếp theo ĐÚNG danh sách và thứ tự do chủ dự án gửi
 * (file "Các cột trong bảng Thống kê sản lượng.docx", 2026-11-15), không chia nhóm.
 *
 * Cột đã có dữ liệu thì lấy từ kết quả tính sản lượng / danh mục Xe, Máy; cột CHƯA có dữ liệu (chủ dự án
 * sẽ bổ sung công thức/điều kiện) vẫn có mặt trong bảng nhưng để TRỐNG — khoá `__<tên>` không có trong dòng dữ liệu.
 * MỖI DÒNG của file là MỘT cột, giữ NGUYÊN nhãn/chính tả của file (kể cả các lỗi gõ như "Nơi dở tải",
 * "Nơi dỡ thải") và KHÔNG thêm cột nào ngoài danh sách. Ngoại lệ duy nhất do chủ dự án xác nhận: cột "Nb-h2"
 * thứ hai trong file đúng ra là "Na-h2".
 *
 * Dùng chung cho cả bảng trên màn hình và file Excel xuất ra, để hai bên không bao giờ lệch nhau
 * về thứ tự hay nhãn cột.
 */
export interface ReportColumn {
  /** Khoá cột: tên trường của dòng dữ liệu, hoặc `__...` cho cột tính ra / cột chưa có dữ liệu. */
  key: string;
  label: string;
  /** Chữ cái cột trong sheet `tinh toan` của Excel (nếu có). */
  excel?: string;
  /** Cột số: căn phải và định dạng theo `scale`. */
  numeric?: boolean;
  scale?: number;
  /** Số chữ số thập phân TỐI THIỂU (mặc định = `scale`); đặt 0 để bỏ số 0 đuôi. */
  minScale?: number;
  width: string;
  /** Giá trị tính ra từ dòng (thay vì đọc thẳng trường `key`). */
  value?: (row: ProductionReportRow) => unknown;
}

/** Giá trị thô của một ô. */
export function cellValue(row: ProductionReportRow, col: ReportColumn): unknown {
  return col.value ? col.value(row) : (row as unknown as Record<string, unknown>)[col.key];
}

const wOf = (label: string) => `min-w-[${Math.max(90, label.length * 9 + 56)}px]`;

/** Cột chữ lấy thẳng từ trường dữ liệu. */
const t = (key: string, label: string, excel?: string): ReportColumn => ({ key, label, excel, width: wOf(label) });
/** Cột số lấy thẳng từ trường dữ liệu. */
const n = (key: string, label: string, scale: number, excel?: string): ReportColumn => ({
  key,
  label,
  excel,
  numeric: true,
  scale,
  width: wOf(label),
});
/** Cột CHƯA có dữ liệu — để trống, chờ chủ dự án bổ sung. */
const e = (id: string, label: string): ReportColumn => ({ key: `__${id}`, label, width: wOf(label) });

/** Năm / tháng / ngày của ngày sản xuất, dạng chữ (không định dạng nghìn như cột số). */
const datePart = (row: ProductionReportRow, i: 0 | 1 | 2): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(row.productionDate ?? "");
  return m ? String(Number(m[i + 1])) : "";
};

/**
 * Phân loại Đất/Than của một dòng. Chép LẠI đúng quy tắc backend
 * (`ProductionKeys.classify` — cột AD của bảng tính gốc: chữ cái ĐẦU của
 * Sản phẩm nghiệm thu là S hoặc D thì ĐẤT, còn lại là THAN), không suy diễn
 * quy tắc mới — chỉ để hiển thị/lọc, không dùng để tính toán.
 */
export function classifyEarthCoal(acceptanceProduct: string | null): "Đất" | "Than" {
  const first = (acceptanceProduct ?? "").trim().charAt(0).toUpperCase();
  return first === "S" || first === "D" ? "Đất" : "Than";
}

/** Tổng KLVC TKE (tấn) quy ẩm = Tổng KLVC TKE (m3-ban đầu) × Tỷ trọng (ban đầu), làm tròn 5 số lẻ; thiếu một vế = trống. */
const tkeTonQa = (r: ProductionReportRow): number | null =>
  r.totalM3Original == null || r.densityOriginal == null ? null : Number((r.totalM3Original * r.densityOriginal).toFixed(5));

export const ALL_REPORT_COLUMNS: ReportColumn[] = [
  { key: "__year", label: "Năm", width: wOf("Năm"), value: (r) => datePart(r, 0) },
  { key: "__month", label: "Tháng", width: wOf("Tháng"), value: (r) => datePart(r, 1) },
  { key: "__day", label: "Ngày", width: wOf("Ngày"), value: (r) => datePart(r, 2) },
  t("shiftName", "Ca", "C"),
  t("excavationAreaName", "Khu vực xúc", "D"),
  t("excavatorCode", "Máy xúc", "E"),
  t("receivingFloor", "Tầng nhận tải"),
  t("loadingPointName", "Nơi nhận tải (vỉa/kho)", "G"),
  t("unloadingFloor", "Tầng dỡ tải"),
  t("unloadingPointName", "Nơi dỡ tải", "I"),
  t("cargoGroupName", "Nhóm chủng loại hàng", "J"),
  t("cargoTypeName", "Chủng loại hàng", "K"),
  n("routeDistanceKm", "Cung độ toàn tuyến (km)", 3, "L"),
  n("routeLiftM", "Nâng tải toàn tuyến (m)", 3),
  n("localSlopeDistanceKm", "Cung độ dốc cục bộ", 3),
  // Nhánh "dốc cục bộ < nâng tải" giữ nguyên số nâng tải (có thể lẻ), các nhánh khác làm tròn nguyên → không ép số 0 đuôi.
  { ...n("fuelPaymentLift", "Chênh cao thanh toán nhiên liệu", 3), minScale: 0 },
  t("vehicleCode", "Số xe", "Q"),
  n("tripCount", "Số chuyến", 0, "R"),
  // HSTĐ lấy từ báo cáo Áp Trắc địa của tháng (cùng con số ở màn Áp Trắc địa)
  n("apHsM3", "HSTĐ (m3)", 6),
  n("apHsTon", "HSTĐ (tấn)", 6),
  n("apHsTkm", "HSTĐ Đất + Than (tkm)", 6),
  e("baoCao", "Báo cáo"),
  { key: "__ngayMua", label: "Ngày mưa", width: wOf("Ngày mưa"), value: (r) => (r.rainyDay ? "x" : "") },
  n("weighedWeightTon", "KL qua cân (tấn)", 3),
  t("loadLevel", "Tải trọng"),
  n("provisionalModel", "Mô hình (tạm tính)", 3),
  n("provisionalDensity", "Tỷ trọng (cập nhật)", 3),
  n("bulkDensityUsed", "Thể trọng TĐ", 3, "AC"),
  {
    key: "__phanLoai",
    label: "Phân loại",
    width: wOf("Phân loại"),
    value: (r) => (r.acceptanceProduct ? classifyEarthCoal(r.acceptanceProduct) : ""),
  },
  { key: "__laiXeBoTuc", label: "Lái xe bổ túc", width: wOf("Lái xe bổ túc"), value: (r) => (r.supplementaryVehicle ? "x" : "") },
  // Hệ số chênh lệch _CTNB (Báo chuyến) = 0/trống → 1; khác 0 → chính hệ số đó
  { ...n("ctnbFactor", "HS áp cho than CTNB", 4), minScale: 0 },
  t("cargoSpntCn", "SPNT/CN"),
  n("deductionAmount", "Trừ vơi (đất-m3/than-tấn)", 3),
  n("densityUsed", "Tỷ trọng (tấn/m3)", 3, "AI"),
  n("modelUsed", "Mô hình (m3/chuyến)", 3, "AJ"),
  t("benchGroup", "Nhóm tầng", "CR"),
  n("totalM3", "Tổng m3", 3, "AL"),
  n("totalTon", "Tổng KLVC (tấn)", 3, "AM"),
  n("totalTkm", "Tổng Tkm", 4, "AN"),
  // Đá thải (tấn) = giá trị tự nhập (Báo chuyến) × Tổng KLVC TKE ban đầu chưa trừ đá, chỉ nhóm THANV; (m3) = tấn ÷ 2,625 (KC) / 2,617 (CS)
  n("wasteRockTon", "Đá thải (tấn)", 3, "FK"),
  n("wasteRockM3", "Đá thải (m3)", 3, "FJ"),
  // Tổng km vận chuyển = Cung độ toàn tuyến × Số chuyến
  n("totalKmTransport", "Tổng km vận chuyển", 3, "AO"),
  // Nội suy định mức nhiên liệu: Hb/Ha = mốc cung độ kề dưới/kề trên cung độ toàn tuyến; h1/h2 = mốc dốc kề dưới/kề trên
  // chênh cao thanh toán; Nb/Na = nhiên liệu tương ứng Hb/Ha; Nt = NLĐM tiêu hao cần tìm.
  { ...n("fuelHb", "Hb-CĐ cận trên", 3), minScale: 0 },
  { ...n("fuelHa", "Ha-CĐ cận dưới", 3), minScale: 0 },
  { ...n("fuelH1", "h1-Dốc cận trước", 3), minScale: 0 },
  { ...n("fuelH2", "h2-Dốc cận sau", 3), minScale: 0 },
  n("fuelNbH1", "Nb-h1", 3),
  n("fuelNbH2", "Nb-h2", 3),
  n("fuelNb", "Nb-NL tương ứng Hb", 3),
  n("fuelNaH1", "Na-h1", 3),
  n("fuelNaH2", "Na-h2", 3),
  n("fuelNa", "Na-NL tương ứng Ha", 3),
  n("fuelNt", "Nt-NLĐM tiêu hao", 3),
  // Chuỗi ĐMNL: Nt × hệ số mùa (tháng 6–9: 1,03) → công ty (= theo mùa) → × hệ số hạng xe (A 0,97 · B 1 · C1 1,04 · khác 1,06)
  // → × 1,03 nếu xe cải tạo toa → × HS Than (CN-NK) = ĐMNL xe (Đ/C tháng)
  n("fuelNormSeasonal", "ĐMNL (mùa)", 4),
  { ...n("fuelNormSeasonal", "ĐMNL (công ty)", 4), key: "__dmnlCongTy", value: (r) => r.fuelNormSeasonal },
  n("fuelNormVehicleClass", "ĐMNL (hãng xe)", 4),
  n("fuelNormCarRenovation", "ĐMNL (cải tạo ben)", 4),
  { ...n("fuelCoalCnNkFactor", "HS Than (CN-NK)", 4), minScale: 0 },
  n("fuelNorm", "ĐMNL xe (Đ/C tháng)", 4, "BF"),
  n("fuelBaseConsumption", "NL tiêu hao theo ĐM (lít)", 4, "BG"),
  // BSNL (lít) = tỷ lệ của danh mục "Hệ số BSNL" × NL tiêu hao theo ĐM; chưa khai điều kiện nào = 0. "BSNL (SPNT/CN)" chưa có công thức.
  n("bsnlRoda", "BSNL (roda)", 4),
  n("bsnlRainyDay", "BSNL (ngày mưa)", 4),
  n("bsnlSupplementary", "BSNL (bổ túc)", 4),
  n("bsnlMaintenance", "BSNL (SC, BD)", 4),
  n("bsnlOther", "BSNL (khác)", 4),
  n("bsnlSpnt", "BSNL (SPNT)", 4),
  n("bsnlMud", "BSNL (bùn)", 4),
  e("bsnlSpntCn", "BSNL (SPNT/CN)"),
  // ĐMNL xe (QĐ 1828) = NL tiêu hao theo ĐM + toàn bộ các khoản BSNL (SPNT/CN, bùn, SPNT, khác, SC-BD, bổ túc, ngày mưa, Roda)
  n("fuelTotalBeforeAdjustment", "ĐMNL xe (QĐ 1828_25/02/2025) (Số Tke)", 4, "BP"),
  // NLĐM hiện hành = ĐMNL xe (QĐ 1828) × HS điều chỉnh NLĐM (tra theo Chủng loại xe + Chất lượng + Phân loại)
  n("fuelCurrentNorm", "NLĐM hiện hành (Số Tke)", 4, "BQ"),
  n("productivityNorm", "ĐM năng suất xe (ch/ca)", 2, "BR"),
  // Chênh cao NLxM3 = Chênh cao thanh toán nhiên liệu × Tổng m3
  {
    key: "__chenhCaoNlxM3",
    label: "Chênh cao NLxM3",
    numeric: true,
    scale: 3,
    minScale: 0,
    width: wOf("Chênh cao NLxM3"),
    value: (r) =>
      r.fuelPaymentLift == null || r.totalM3 == null ? null : Number((r.fuelPaymentLift * r.totalM3).toFixed(3)),
  },
  t("cargoCode", "Mã hàng hóa", "BT"),
  t("cargoTtlCode", "Mã hàng TTL", "BU"),
  t("seamKpmb", "Vỉa KPMB", "BV"),
  t("mudMark", "Ký hiệu bùn", "CR"),
  n("densityNoMoisture", "Tỷ trọng (không QA)", 3, "CC"),
  n("totalTonNoMoisture", "Tổng KLVC TKE (tấn-không QA)", 5, "CD"),
  n("totalTkmNoMoisture", "Tổng TKE (tkm-không QA)", 3, "CE"),
  n("densityOriginal", "Tỷ trọng (ban đầu)", 3, "CF"),
  n("totalM3Original", "Tổng KLVC TKE (m3-ban đầu)", 3, "CG"),
  // Quy ẩm: Tổng KLVC TKE (tấn) = Tổng KLVC TKE (m3-ban đầu) × Tỷ trọng (ban đầu), làm tròn 5 số lẻ;
  // Tổng TKE (tkm) = Tổng KLVC TKE (tấn) quy ẩm × Cung độ toàn tuyến, làm tròn 3 số lẻ.
  {
    key: "__tkeTonQa",
    label: "Tổng KLVC TKE (tấn-QA)",
    numeric: true,
    scale: 5,
    width: wOf("Tổng KLVC TKE (tấn-QA)"),
    value: (r) => tkeTonQa(r),
  },
  {
    key: "__tkeTkmQa",
    label: "Tổng TKE (tkm-QA)",
    numeric: true,
    scale: 3,
    width: wOf("Tổng TKE (tkm-QA)"),
    value: (r) => {
      const ton = tkeTonQa(r);
      return ton == null || r.routeDistanceKm == null ? null : Number((ton * r.routeDistanceKm).toFixed(3));
    },
  },
  n("totalTonOriginalBeforeWaste", "Tổng KLVC TE (tấn- ban đầu, chưa trừ đá)", 5, "CK"),
  t("acceptanceProduct", "Tên nghiệm thu", "AG"),
  e("bbntMaHangHoa", "BBNT-Mã hàng hóa"),
  e("nhomTangMayXuc", "Nhóm tầng + Máy xúc"),
  t("seamGroupName", "Nhóm vỉa", "CR"),
  t("seamGroupExcavatorKey", "Nhóm vỉa + Máy xúc", "CR"),
  e("nhomViaNhomTang", "Nhóm vỉa + Nhóm tầng"),
  e("nhomViaNhomTangNoiDo", "Nhóm vỉa + Nhóm tầng + Nơi dở tải"),
  e("noiNhanNoiDo", "Nơi nhận tải + Nơi dỡ tải"),
  e("noiNhanNhomTang", "Nơi nhận tải + Nhóm tầng"),
  e("noiNhanNhomTangNoiDo", "Nơi nhận tải + Nhóm tầng + Nơi dỡ thải"),
  t("vehicleCarRenovation", "Cải tạo toa"),
  t("vehicleNumber", "Số hiệu xe"),
  t("vehicleTypeName", "Chủng loại xe"),
  t("vehicleCategoryClassName", "Chủng loại xe + Phân loại"),
  t("vehicleRankName", "Hạng xe"),
  // Chủng loại xe _ Nhóm hạng xe (vd HM400-2R_C)
  t("vehicleTypeRankGroupKey", "Chủng loại xe + Nhóm hạng xe"),
  t("vehicleDepartmentName", "Đơn vị quản lý (xe)"),
  // Chủng loại xe + hậu tố ĐMNL (.Bun / .Dat / .BK / .DAT|.Than) — suy từ chủng loại hàng, nơi dỡ tải, SPNT, phân loại
  t("vehicleFuelNormKey", "Chủng loại xe ĐMNL"),
  t("excavatorNumber", "Số máy"),
  t("excavatorTypeName", "Chủng loại máy"),
  t("excavatorRankName", "Hạng máy"),
  e("chungLoaiMayHangMay", "Chủng loại máy + Hạng máy"),
  t("excavatorBucketName", "Gầu xúc"),
  t("excavatorDepartmentName", "Đơn vị quản lý (máy)"),
];

/** Các cột của nút "Chỉ cột chính" — thông tin chuyến lấy thẳng từ phiếu (như trước khi bỏ nhóm). */
export const MAIN_COLUMN_KEYS: string[] = [
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
 * Bảng rộng hơn 100 cột; không giữ lại năm/tháng thì cuộn một đoạn là mất dấu đang đọc dòng nào.
 */
export const FROZEN_COLUMN_COUNT = 3;

/** Hiển thị một ô: số thì căn phải và cố định số chữ số thập phân. */
export function formatCell(value: unknown, col: ReportColumn): string {
  if (value === null || value === undefined || value === "") return "";
  if (!col.numeric) return String(value);
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: col.minScale ?? col.scale ?? 0,
    maximumFractionDigits: col.scale ?? 0,
  });
}
