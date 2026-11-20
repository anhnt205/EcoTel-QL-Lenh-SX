import type { CatalogConfig, CatalogField } from "./types";

/** Ba trường dùng chung của các danh mục địa điểm. */
const placeFields = (label: string) => [
  { key: "code", label: `Mã ${label}`, required: true, type: "text" as const, width: "min-w-[160px]" },
  { key: "name", label: label.charAt(0).toUpperCase() + label.slice(1), required: true, type: "text" as const, width: "min-w-[180px]" },
  { key: "note", label: "Ghi chú", type: "text" as const, width: "min-w-[200px]" },
];

export const excavationAreaConfig: CatalogConfig = {
  basePath: "/excavation-areas",
  title: "Khu vực xúc",
  nounPhrase: "khu vực xúc",
  breadcrumb: ["Danh mục", "Khai thác"],
  searchPlaceholder: "Tìm kiếm theo mã khu vực xúc, khu vực xúc",
  // "Nhóm khu vực" (CS/KC) là chiều mà MỌI công thức sản lượng so sánh —
  // bảng tính so `D5="CS"`/`"KC"` trong khi danh mục thật có nhiều khu.
  // Xem QĐ-13. Không khai nhóm thì engine không tính được chuyến đó.
  fields: [
    { key: "code", label: "Mã khu vực xúc", required: true, type: "text", width: "min-w-[160px]" },
    { key: "name", label: "Khu vực xúc", required: true, type: "text", width: "min-w-[180px]" },
    {
      key: "areaGroup",
      label: "Nhóm khu vực (CS/KC)",
      type: "select",
      optionsFrom: "area-groups",
      width: "min-w-[170px]",
    },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const receivingPointConfig: CatalogConfig = {
  basePath: "/receiving-points",
  title: "Nơi nhận tải",
  nounPhrase: "nơi nhận tải",
  breadcrumb: ["Danh mục", "Khai thác"],
  searchPlaceholder: "Tìm kiếm theo mã nơi nhận tải, nơi nhận tải, nhóm vỉa",
  fields: [
    { key: "code", label: "Mã nơi nhận tải", required: true, type: "text", width: "min-w-[160px]" },
    { key: "name", label: "Nơi nhận tải", required: true, type: "text", width: "min-w-[160px]" },
    { key: "seamGroupId", label: "Nhóm vỉa", type: "select", optionsPath: "/seam-groups", width: "min-w-[140px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[180px]" },
  ],
};

export const unloadingPointConfig: CatalogConfig = {
  basePath: "/unloading-points",
  title: "Nơi dỡ tải",
  nounPhrase: "nơi dỡ tải",
  breadcrumb: ["Danh mục", "Khai thác"],
  searchPlaceholder: "Tìm kiếm theo mã nơi dỡ tải, nơi dỡ tải",
  fields: placeFields("nơi dỡ tải"),
};

export const pickupPointConfig: CatalogConfig = {
  basePath: "/pickup-points",
  title: "Nơi chất tải",
  nounPhrase: "nơi chất tải",
  breadcrumb: ["Danh mục", "Khai thác"],
  searchPlaceholder: "Tìm kiếm theo mã nơi chất tải, nơi chất tải",
  fields: placeFields("nơi chất tải"),
};

export const cargoTypeConfig: CatalogConfig = {
  basePath: "/cargo-types",
  title: "Chủng loại hàng",
  nounPhrase: "chủng loại hàng",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã, tên chủng loại hàng...",
  description: "Quản lý danh mục chủng loại hàng",
  designWidths: [150, 205, 195, 165, 138, 130, 105],
  fields: [
    { key: "code", label: "Mã chủng loại hàng", required: true, type: "text", width: "min-w-[150px]" },
    { key: "name", label: "Chủng loại hàng", required: true, type: "text", width: "min-w-[150px]" },
    { key: "cargoGroupId", label: "Nhóm chủng loại hàng", required: true, type: "select", optionsPath: "/cargo-groups", width: "min-w-[170px]" },
    { key: "acceptanceProductId", label: "Sản phẩm nghiệm thu", type: "select", optionsPath: "/acceptance-products", width: "min-w-[160px]" },
    { key: "ttlClhId", label: "TTL CLH", type: "select", optionsPath: "/ttl-clh-items", width: "min-w-[120px]" },
    { key: "mudMarkId", label: "Ký hiệu bùn", type: "select", optionsPath: "/mud-marks", width: "min-w-[130px]" },
    { key: "description", label: "Ghi chú", type: "text", width: "min-w-[150px]" },
  ],
};

// ── Nhóm A: 3 danh mục đơn giản của phần Thống kê sản lượng ─────────────
// "Nhóm chủng loại hàng" dùng lại bảng cargo_groups ĐÃ CÓ (đừng tạo bảng
// mới — xem DESIGN_DANH_MUC_SANLUONG.md mục 1.1).

export const cargoGroupConfig: CatalogConfig = {
  basePath: "/cargo-groups",
  title: "Nhóm chủng loại hàng",
  nounPhrase: "nhóm chủng loại hàng",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã nhóm, nhóm chủng loại hàng",
  fields: [
    { key: "code", label: "Mã nhóm chủng loại hàng", required: true, type: "text", width: "min-w-[190px]" },
    { key: "name", label: "Nhóm chủng loại hàng", required: true, type: "text", width: "min-w-[180px]" },
    { key: "classificationId", label: "Phân loại", type: "select", optionsPath: "/classifications", width: "min-w-[160px]" },
    { key: "description", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const acceptanceProductConfig: CatalogConfig = {
  basePath: "/acceptance-products",
  title: "Sản phẩm nghiệm thu",
  nounPhrase: "sản phẩm nghiệm thu",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã, sản phẩm nghiệm thu",
  fields: [
    { key: "code", label: "Mã sản phẩm nghiệm thu", required: true, type: "text", width: "min-w-[190px]" },
    { key: "name", label: "Sản phẩm nghiệm thu", required: true, type: "text", width: "min-w-[180px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const ttlClhConfig: CatalogConfig = {
  basePath: "/ttl-clh-items",
  title: "TTL CLH",
  nounPhrase: "TTL CLH",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo TTL CLH",
  fields: [
    { key: "code", label: "Mã TTL CLH", required: true, type: "text", width: "min-w-[170px]" },
    { key: "name", label: "TTL CLH", required: true, type: "text", width: "min-w-[160px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

// ── Lớp 1 của B1: các danh mục phẳng phục vụ khoá ghép và công thức ────────
// Xem docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md mục 3.3.

export const seamGroupConfig: CatalogConfig = {
  basePath: "/seam-groups",
  title: "Nhóm vỉa",
  nounPhrase: "nhóm vỉa",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã nhóm vỉa, nhóm vỉa",
  fields: [
    { key: "code", label: "Mã nhóm vỉa", required: true, type: "text", width: "min-w-[170px]" },
    { key: "name", label: "Nhóm vỉa", required: true, type: "text", width: "min-w-[170px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const vehicleTypeConfig: CatalogConfig = {
  basePath: "/vehicle-types",
  title: "Chủng loại xe",
  nounPhrase: "chủng loại xe",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã chủng loại xe, chủng loại xe",
  fields: placeFields("chủng loại xe"),
};

export const mudMarkConfig: CatalogConfig = {
  basePath: "/mud-marks",
  title: "Ký hiệu bùn",
  nounPhrase: "ký hiệu bùn",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo ký hiệu bùn, ghi chú",
  fields: [
    { key: "name", label: "Ký hiệu bùn", required: true, type: "text", width: "min-w-[200px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[240px]" },
  ],
};

export const suffixConfig: CatalogConfig = {
  basePath: "/suffixes",
  title: "Hậu tố",
  nounPhrase: "hậu tố",
  breadcrumb: ["Danh mục", "Danh mục khác"],
  searchPlaceholder: "Tìm kiếm theo hậu tố, ghi chú",
  fields: [
    { key: "suffix", label: "Hậu tố", required: true, type: "text", width: "min-w-[200px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[240px]" },
  ],
};

export const classificationConfig: CatalogConfig = {
  basePath: "/classifications",
  title: "Phân loại",
  nounPhrase: "phân loại",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã phân loại, phân loại",
  fields: placeFields("phân loại"),
};

export const vehicleRankGroupConfig: CatalogConfig = {
  basePath: "/vehicle-rank-groups",
  title: "Nhóm hạng xe/máy",
  nounPhrase: "nhóm hạng xe/máy",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã nhóm, nhóm hạng xe/máy",
  fields: placeFields("nhóm hạng xe/máy"),
};

export const vehicleRankConfig: CatalogConfig = {
  basePath: "/vehicle-ranks",
  title: "Hạng xe/máy",
  nounPhrase: "hạng xe/máy",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã hạng, nhóm hạng xe/máy",
  fields: [
    { key: "code", label: "Hạng xe/máy", required: true, type: "text", width: "min-w-[140px]" },
    { key: "vehicleRankGroupId", label: "Nhóm hạng xe/máy", required: true, type: "select", optionsPath: "/vehicle-rank-groups", width: "min-w-[180px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

// Danh mục "Chủng loại xe + DMNL" đã bỏ khỏi menu/trang quản lý (2026-11-15); bảng và API /vehicle-fuel-classes vẫn giữ vì
// cột "Chủng loại xe (NL)" của Xe, Định mức nhiên liệu và Mô hình còn tham chiếu tới.

export const excavatorBucketConfig: CatalogConfig = {
  basePath: "/excavator-buckets",
  title: "Gầu xúc",
  nounPhrase: "gầu xúc",
  breadcrumb: ["Danh mục", "Thiết bị"],
  searchPlaceholder: "Tìm kiếm theo mã gầu xúc, gầu xúc",
  fields: [
    { key: "code", label: "Mã gầu xúc", required: true, type: "text", width: "min-w-[150px]" },
    { key: "name", label: "Gầu xúc", required: true, type: "text", width: "min-w-[170px]" },
    { key: "capacity", label: "Dung tích gầu (m³)", type: "number", width: "min-w-[160px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const vehicleCategoryClassConfig: CatalogConfig = {
  basePath: "/vehicle-category-classes",
  title: "Chủng loại xe + Phân loại",
  nounPhrase: "chủng loại xe + phân loại",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã, chủng loại xe + phân loại",
  fields: [
    { key: "code", label: "Mã chủng loại xe + phân loại", required: true, type: "text", width: "min-w-[210px]" },
    { key: "name", label: "Chủng loại xe + phân loại", required: true, type: "text", width: "min-w-[200px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const coefficientConfig: CatalogConfig = {
  basePath: "/coefficients",
  title: "Hệ số",
  nounPhrase: "hệ số",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã hệ số, hệ số",
  fields: [
    { key: "code", label: "Mã hệ số", required: true, type: "text", width: "min-w-[150px]" },
    { key: "name", label: "Tên hệ số", required: true, type: "text", width: "min-w-[200px]" },
    { key: "value", label: "Giá trị", required: true, type: "number", width: "min-w-[120px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

// Hệ số nhân tính tấn của than sản xuất = Hệ số KCS ÷ Hệ số Than TKE trừ đá (theo tháng) — xem CoalCoefficient (backend).
export const coalCoefficientConfig: CatalogConfig = {
  basePath: "/coal-coefficients",
  title: "Hệ số Than TKE trừ đá / KCS",
  nounPhrase: "hệ số than",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo thời gian, ghi chú",
  // Không có cột mã: mỗi dòng là một khoảng thời gian.
  uniqueCodeKey: null,
  labelKey: "period",
  fields: [
    // Một cột "Thời gian": chọn tháng/năm bắt đầu - tháng/năm kết thúc (lưu dạng "MM/yyyy - MM/yyyy")
    { key: "period", label: "Thời gian", required: true, type: "monthRange", placeholder: "MM/yyyy - MM/yyyy", width: "min-w-[330px]" },
    { key: "thanTkeTruDa", label: "Hệ số Than TKE trừ đá", required: true, type: "number", width: "min-w-[190px]" },
    { key: "kcs", label: "Hệ số KCS", required: true, type: "number", width: "min-w-[150px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

// Đá thải (m3) = Đá thải (tấn) ÷ Hệ số đá thải của khu vực xúc trong tháng — xem WasteRockCoefficient (backend).
export const wasteRockCoefficientConfig: CatalogConfig = {
  basePath: "/waste-rock-coefficients",
  title: "Hệ số đá thải",
  nounPhrase: "hệ số đá thải",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo thời gian, khu vực xúc",
  // Không có cột mã: mỗi dòng là một khoảng thời gian của một khu vực xúc.
  uniqueCodeKey: null,
  labelKey: "period",
  fields: [
    { key: "period", label: "Thời gian", required: true, type: "monthRange", placeholder: "MM/yyyy - MM/yyyy", width: "min-w-[330px]" },
    { key: "excavationAreaId", label: "Khu vực xúc", required: true, type: "select", optionsPath: "/excavation-areas", width: "min-w-[180px]" },
    { key: "coefficient", label: "Hệ số đá thải", required: true, type: "number", width: "min-w-[150px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

// ── Hệ số ĐMNL / BSNL tạo động (thay cho hằng số trong code) — xem FuelNormFactor (backend) ──────────────────────
const periodField = {
  key: "period",
  label: "Thời gian",
  required: true,
  type: "monthRange" as const,
  placeholder: "MM/yyyy - MM/yyyy",
  width: "min-w-[330px]",
};

export const fuelSeasonFactorConfig: CatalogConfig = {
  basePath: "/fuel-season-factors",
  title: "Hệ số ĐMNL theo mùa",
  nounPhrase: "hệ số ĐMNL theo mùa",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo thời gian, ghi chú",
  uniqueCodeKey: null,
  labelKey: "period",
  fields: [
    periodField,
    { key: "factor", label: "Hệ số (nhân vào ĐMNL)", required: true, type: "number", width: "min-w-[180px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const fuelRankFactorConfig: CatalogConfig = {
  basePath: "/fuel-rank-factors",
  title: "Hệ số ĐMNL theo hạng xe",
  nounPhrase: "hệ số ĐMNL theo hạng xe",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo thời gian, hạng xe",
  uniqueCodeKey: null,
  labelKey: "period",
  fields: [
    periodField,
    { key: "vehicleRankId", label: "Hạng xe/máy", required: true, type: "select", optionsPath: "/vehicle-ranks", width: "min-w-[150px]" },
    { key: "factor", label: "Hệ số (nhân vào ĐMNL)", required: true, type: "number", width: "min-w-[180px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const fuelRenovationFactorConfig: CatalogConfig = {
  basePath: "/fuel-renovation-factors",
  title: "Hệ số ĐMNL theo cải tạo ben",
  nounPhrase: "hệ số ĐMNL theo cải tạo ben",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo thời gian, ghi chú",
  uniqueCodeKey: null,
  labelKey: "period",
  fields: [
    periodField,
    { key: "factor", label: "Hệ số (xe Cải tạo toa)", required: true, type: "number", width: "min-w-[180px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

/**
 * HS Than (CN-NK): MỖI DẠNG ĐIỀU KIỆN một cấu hình riêng với đúng các trường của nó. Công thức xét theo thứ tự từ
 * trên xuống (1 → 2 → 3), thoả dạng nào thì không xét tiếp. Phải khớp FuelCoalCondition phía backend.
 */
export const COAL_CONDITIONS = ["Chủng loại xe", "Khu vực + Hàng + Xe", "Cung độ + Xe"] as const;
export type CoalConditionLabel = (typeof COAL_CONDITIONS)[number];

const coalVehicleField = (placeholder: string): CatalogField => ({
  multiSource: "vehicleTypes",
  key: "vehicleType",
  label: "Chủng loại xe",
  required: true,
  type: "text",
  placeholder,
  width: "min-w-[240px]",
});

export function fuelCoalFactorConfigFor(condition: CoalConditionLabel): CatalogConfig {
  const fields: CatalogField[] =
    condition === "Chủng loại xe"
      ? [coalVehicleField("VolvoA40F, VolvoA40G")]
      : condition === "Khu vực + Hàng + Xe"
        ? [
            {
              key: "areaGroup",
              label: "Khu vực xúc (nhóm)",
              required: true,
              type: "select",
              options: [{ value: "CS", label: "CS" }, { value: "KC", label: "KC" }],
              width: "min-w-[160px]",
            },
            { key: "cargo", label: "Chủng loại hàng", required: true, type: "text", multiSource: "cargoTypes", placeholder: "SPNT.Baichua", width: "min-w-[200px]" },
            coalVehicleField("HD465*"),
          ]
        : [
            { key: "maxDistanceKm", label: "Cung độ toàn tuyến nhỏ hơn (km)", required: true, type: "number", width: "min-w-[230px]" },
            coalVehicleField("HD465-7R"),
          ];
  const order = COAL_CONDITIONS.indexOf(condition) + 1;
  return {
    basePath: "/fuel-coal-factors",
    title: `Hệ số Than (CN-NK) — ${condition}`,
    nounPhrase: `hệ số Than (CN-NK) theo ${condition.toLowerCase()}`,
    breadcrumb: ["Danh mục", "Thống kê sản lượng"],
    searchPlaceholder: "Tìm kiếm theo thời gian, chủng loại xe, ghi chú",
    description: `Dạng điều kiện ${order}/3. Chỉ áp cho chuyến có SPNT/CN = Than_CN; các dạng xét theo thứ tự 1 → 2 → 3, thoả dạng nào thì không xét tiếp; không dạng nào thoả = 1. Chủng loại xe / hàng ghi nhiều giá trị cách nhau bằng dấu phẩy, dấu * ở cuối = bắt đầu bằng (vd HD465* = 5 ký tự đầu là HD465).`,
    uniqueCodeKey: null,
    labelKey: "period",
    fixedValues: { coalCondition: condition },
    fields: [
      periodField,
      ...fields,
      { key: "factor", label: "Hệ số", required: true, type: "number", width: "min-w-[110px]" },
      { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
    ],
  };
}

export const fuelCoalFactorConfig: CatalogConfig = fuelCoalFactorConfigFor("Chủng loại xe");

/**
 * Hệ số BSNL: MỖI LOẠI một cấu hình riêng với đúng các trường phù hợp (cùng bảng `fuel_norm_factors`, tách bằng
 * `bsnlType` cố định). Phải khớp FuelBsnlType.uses… phía backend — backend xoá trắng trường không thuộc loại.
 */
export const BSNL_TYPES = ["Roda", "Ngày mưa", "Bổ túc", "SC, BD", "Khác", "SPNT", "Bùn"] as const;
export type BsnlTypeLabel = (typeof BSNL_TYPES)[number];

const bsnlNote: Record<BsnlTypeLabel, string> = {
  Roda: "Chỉ tính cho chuyến có Mức tải = Roda (2/3). Mỗi chuyến như vậy = Tỷ lệ × Nhiên liệu tiêu hao theo ĐM.",
  "Ngày mưa": "Chỉ tính cho chuyến được tích Ngày mưa. Mỗi chuyến như vậy = Tỷ lệ × Nhiên liệu tiêu hao theo ĐM.",
  "Bổ túc": "Chỉ tính cho chuyến được tích Xe bổ túc. Mỗi chuyến như vậy = Tỷ lệ × Nhiên liệu tiêu hao theo ĐM.",
  "SC, BD": "Tỷ lệ × Nhiên liệu tiêu hao theo ĐM, theo Chủng loại xe. Các dòng xét theo Thứ tự xét (số nhỏ trước), dòng thoả đầu tiên thắng; để trống Chủng loại xe = áp cho mọi xe. Không dòng nào thoả = 0.",
  Khác: "Tỷ lệ × Nhiên liệu tiêu hao theo ĐM, theo Số xe (vd 965*). Các dòng xét theo Thứ tự xét, dòng thoả đầu tiên thắng. Không dòng nào thoả = 0.",
  SPNT: "Tỷ lệ × Nhiên liệu tiêu hao theo ĐM, theo Chủng loại xe và Chủng loại hàng. Các dòng xét theo Thứ tự xét, dòng thoả đầu tiên thắng. Không dòng nào thoả = 0.",
  Bùn: "Tỷ lệ (hệ số bùn) × Nhiên liệu tiêu hao theo ĐM, theo Chủng loại xe và Chủng loại hàng; có thể làm tròn. Các dòng xét theo Thứ tự xét, dòng thoả đầu tiên thắng. Không dòng nào thoả = 0.",
};

const BSNL_RATE_FIELD = { key: "factor", label: "Tỷ lệ (× NL tiêu hao theo ĐM)", required: true, type: "number" as const, width: "min-w-[210px]" };
const BSNL_NOTE_FIELD = { key: "note", label: "Ghi chú", type: "text" as const, width: "min-w-[200px]" };
const BSNL_PRIORITY_FIELD = { key: "priority", label: "Thứ tự xét", type: "number" as const, width: "min-w-[110px]" };
const BSNL_VEHICLE_TYPE_FIELD = { key: "vehicleType", label: "Chủng loại xe", type: "text" as const, multiSource: "vehicleTypes" as const, placeholder: "HD465-7*, CAT773E", width: "min-w-[220px]" };
const BSNL_CARGO_FIELD = { key: "cargo", label: "Chủng loại hàng", type: "text" as const, multiSource: "cargoTypes" as const, placeholder: "spnt.via, spnt_uot.via", width: "min-w-[220px]" };

export function fuelBsnlFactorConfigFor(type: BsnlTypeLabel): CatalogConfig {
  const conditionFields: CatalogField[] =
    type === "SC, BD"
      ? [BSNL_VEHICLE_TYPE_FIELD, BSNL_PRIORITY_FIELD]
      : type === "Khác"
        ? [{ key: "vehicleCode", label: "Số xe", type: "text", multiSource: "vehicles", placeholder: "965*", width: "min-w-[220px]" }, BSNL_PRIORITY_FIELD]
        : type === "SPNT"
          ? [BSNL_VEHICLE_TYPE_FIELD, BSNL_CARGO_FIELD, BSNL_PRIORITY_FIELD]
          : type === "Bùn"
            ? [
                BSNL_VEHICLE_TYPE_FIELD,
                BSNL_CARGO_FIELD,
                BSNL_PRIORITY_FIELD,
                { key: "roundDigits", label: "Làm tròn (số lẻ)", type: "number", width: "min-w-[130px]" },
              ]
            : [];
  return {
    basePath: "/fuel-bsnl-factors",
    title: `Hệ số BSNL — ${type}`,
    nounPhrase: `hệ số BSNL ${type}`,
    breadcrumb: ["Danh mục", "Thống kê sản lượng"],
    searchPlaceholder: "Tìm kiếm theo thời gian, ghi chú",
    description: `${bsnlNote[type]} Ghi nhiều giá trị cách nhau bằng dấu phẩy, dấu * ở cuối = bắt đầu bằng.`,
    uniqueCodeKey: null,
    labelKey: "period",
    fixedValues: { bsnlType: type },
    fields: [periodField, ...conditionFields, BSNL_RATE_FIELD, BSNL_NOTE_FIELD],
  };
}

/** Giữ tên cũ cho nơi khác còn tham chiếu (mặc định tab đầu). */
export const fuelBsnlFactorConfig: CatalogConfig = fuelBsnlFactorConfigFor("Roda");

export const reportPeriodConfig: CatalogConfig = {
  basePath: "/report-periods",
  title: "Kỳ báo cáo",
  nounPhrase: "kỳ báo cáo",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo tên kỳ, năm",
  // Không có cột mã: trường đầu là "Năm", nhiều kỳ cùng năm là bình thường.
  uniqueCodeKey: null,
  labelKey: "displayName",
  fields: [
    { key: "year", label: "Năm", required: true, type: "number", width: "min-w-[100px]" },
    { key: "month", label: "Tháng", required: true, type: "number", width: "min-w-[100px]" },
    { key: "periodIndex", label: "Số kỳ", required: true, type: "number", width: "min-w-[100px]" },
    { key: "fromDate", label: "Từ ngày", required: true, type: "date", width: "min-w-[150px]" },
    { key: "toDate", label: "Đến ngày", required: true, type: "date", width: "min-w-[150px]" },
    { key: "displayName", label: "Tên hiển thị", type: "text", width: "min-w-[200px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[180px]" },
  ],
};

/**
 * Tỷ trọng — tham số khai báo theo thời gian (QĐ-04).
 *
 * Khoá là `Chủng loại hàng × Khu vực xúc × khoảng hiệu lực`, nên KHÔNG có
 * cột mã duy nhất: cùng một chủng loại hàng xuất hiện nhiều lần ở các khoảng
 * thời gian khác nhau là hoàn toàn hợp lệ.
 *
 * Ba cột Nhóm CLH / SPNT / TTL CLH là giá trị kéo theo Chủng loại hàng, để
 * người nhập đối chiếu — chỉ đọc, không vào biểu mẫu và không vào file Excel.
 *
 * Khu vực xúc để trống nghĩa là áp cho mọi khu vực; khi tra, bản ghi có khu
 * vực cụ thể được ưu tiên.
 */
export const densityParameterConfig: CatalogConfig = {
  basePath: "/density-parameters",
  title: "Tỷ trọng",
  nounPhrase: "tỷ trọng",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm theo mã/tên chủng loại hàng, khu vực xúc",
  uniqueCodeKey: null,
  labelKey: "cargoTypeName",
  fields: [
    { key: "cargoTypeId", label: "Chủng loại hàng", required: true, type: "select", optionsPath: "/cargo-types", width: "min-w-[180px]" },
    { key: "cargoGroupName", label: "Nhóm CLH", type: "text", readOnly: true, width: "min-w-[140px]" },
    { key: "acceptanceProduct", label: "SPNT", type: "text", readOnly: true, width: "min-w-[120px]" },
    { key: "ttlClh", label: "TTL CLH", type: "text", readOnly: true, width: "min-w-[120px]" },
    { key: "excavationAreaId", label: "Khu vực xúc", type: "select", optionsPath: "/excavation-areas", placeholder: "Tất cả khu vực", width: "min-w-[160px]" },
    { key: "effectiveFrom", label: "Từ ngày", required: true, type: "date", width: "min-w-[150px]" },
    { key: "effectiveTo", label: "Đến ngày", required: true, type: "date", width: "min-w-[150px]" },
    { key: "densityWet", label: "Tỷ trọng (quy ẩm)", required: true, type: "number", width: "min-w-[150px]" },
    { key: "densityDry", label: "Tỷ trọng (không quy ẩm)", required: true, type: "number", width: "min-w-[170px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[160px]" },
  ],
};

// ── Hai màn STD (số liệu Trắc địa) ─────────────────────────────────────────
// Dùng chung bảng `survey_standards`, phân biệt bằng `catalogType` qua
// `fixedValues` — người dùng không phải chọn, và không thể chọn nhầm.

/** Các cột của khối ĐẤT, dùng chung cho cả hai màn (chỉ khác nhãn). */
const earthFields = (label: string): CatalogField[] => [
  { key: "earthAcceptanceProduct", label: `${label} (SPNT)`, type: "text", width: "min-w-[150px]" },
  { key: "earthM3", label: `${label} (m3)`, type: "number", width: "min-w-[130px]" },
  { key: "earthDesignVolume", label: "V Tke", type: "number", width: "min-w-[110px]" },
  { key: "earthDeviation", label: "Clech (đất)", type: "number", width: "min-w-[120px]" },
  { key: "earthTon", label: `${label} (tấn)`, type: "number", width: "min-w-[130px]" },
  { key: "earthHaulDistance", label: "CD đất", type: "number", width: "min-w-[110px]" },
  { key: "earthBulkDensity", label: "Thể trọng đất (TĐ)", type: "number", width: "min-w-[160px]" },
  { key: "earthTkm", label: `${label} (tkm)`, type: "number", width: "min-w-[130px]" },
];

const stdCommonFields: CatalogField[] = [
  { key: "seamGroupExcavatorKey", label: "Nhóm vỉa + Máy xúc", required: true, type: "text", width: "min-w-[240px]" },
  { key: "effectiveFrom", label: "Từ ngày", required: true, type: "date", width: "min-w-[150px]" },
  { key: "effectiveTo", label: "Đến ngày", required: true, type: "date", width: "min-w-[150px]" },
];

export const surveyStandardDatCnConfig: CatalogConfig = {
  basePath: "/survey-standards",
  title: "STD (Đất CN)",
  nounPhrase: "dòng STD (Đất CN)",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm theo khoá Nhóm vỉa + Máy xúc",
  uniqueCodeKey: null,
  labelKey: "seamGroupExcavatorKey",
  fixedValues: { catalogType: "DAT_CN" },
  fields: [
    ...stdCommonFields,
    ...earthFields("Đất CN"),
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[160px]" },
  ],
};

export const surveyStandardDatSxConfig: CatalogConfig = {
  basePath: "/survey-standards",
  title: "STD (Đất SX/Than SX)",
  nounPhrase: "dòng STD (Đất SX/Than SX)",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm theo khoá Nhóm vỉa + Máy xúc",
  uniqueCodeKey: null,
  labelKey: "seamGroupExcavatorKey",
  fixedValues: { catalogType: "DAT_SX_THAN_SX" },
  fields: [
    ...stdCommonFields,
    ...earthFields("Đất SX"),
    // Khối THAN — chỉ màn này có. Thứ tự cột giữ đúng như đặc tả docx dòng
    // 228–235 để đối chiếu với bảng gốc cho nhanh.
    { key: "coalAcceptanceProduct", label: "Than SX (SPNT)", type: "text", width: "min-w-[150px]" },
    { key: "coalM3", label: "Than SX (m3)", type: "number", width: "min-w-[130px]" },
    { key: "coalBulkDensity", label: "Thể trọng than (TĐ)", type: "number", width: "min-w-[170px]" },
    { key: "coalTon", label: "Than SX (tấn)", type: "number", width: "min-w-[130px]" },
    { key: "coalDesignVolume", label: "Q Tke", type: "number", width: "min-w-[110px]" },
    { key: "coalDeviation", label: "Clech (than)", type: "number", width: "min-w-[130px]" },
    { key: "coalHaulDistance", label: "CD than", type: "number", width: "min-w-[110px]" },
    { key: "coalTkm", label: "Than SX (tkm)", type: "number", width: "min-w-[140px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[160px]" },
  ],
};

// ── Thuộc tính sản lượng của thiết bị (mục S3) ─────────────────────────────
//
// Thiết bị vốn CHỈ ĐỌC trong hệ (dữ liệu có sẵn, không có màn thêm/sửa).
// Nhưng công thức sản lượng cần hạng xe, chất lượng, hai cách phân nhóm
// chủng loại xe và gầu xúc — nên có màn riêng chỉ để bổ sung những trường đó.
// `canCreate: false` vì màn này không tạo ra thiết bị mới.
//
// Cột "Mã thiết bị" dùng `formHidden`: có trong bảng và trong file Excel (file
// nhập cần mã để biết ghi vào thiết bị nào) nhưng không sửa được ở đây.

const deviceIdentityFields: CatalogField[] = [
  { key: "code", label: "Mã thiết bị", type: "text", formHidden: true, width: "min-w-[140px]" },
  { key: "name", label: "Tên thiết bị", type: "text", readOnly: true, width: "min-w-[160px]" },
  { key: "departmentName", label: "Đơn vị quản lý", type: "text", readOnly: true, width: "min-w-[160px]" },
];

export const vehicleProductionAttrConfig: CatalogConfig = {
  basePath: "/device-production-attributes",
  title: "Thuộc tính sản lượng — Xe",
  nounPhrase: "thuộc tính sản lượng của xe",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm theo mã xe, tên, số xe",
  uniqueCodeKey: null,
  labelKey: "code",
  canCreate: false,
  canDelete: false,
  fixedValues: { categoryGroup: "XE" },
  guideNotes: [
    "- File nhập THAY THẾ toàn bộ thuộc tính sản lượng của thiết bị, không phải bổ sung.",
    "- Vì vậy phải giữ ĐỦ các cột: cột nào bị xoá khỏi file thì giá trị cũ của cột đó sẽ bị xoá theo.",
    "- Cách an toàn: chọn dòng trong bảng rồi Tải xuống, sửa trên chính file đó, rồi Tải lên.",
    "- \"Hạng xe/máy\" nay lấy theo danh mục Hạng xe/máy (nhập ĐÚNG mã hạng), không còn gõ tự do.",
  ],
  fields: [
    ...deviceIdentityFields,
    { key: "vehicleNumber", label: "Số xe", type: "text", readOnly: true, width: "min-w-[120px]" },
    // Ba khoá dưới đây là BA danh mục KHÁC NHAU, không phải ba tên gọi của một
    // thứ (QĐ-11) — cùng một chiếc xe có thể xếp khác nhau ở từng lưới:
    //   • Chủng loại xe (NL) → gốc khoá cột lưới Định mức nhiên liệu (cột DQ)
    //   • Chủng loại xe      → gốc khoá cột lưới Mô hình và Năng suất xe (cột DA)
    //   • Hạng xe            → ghép với Chủng loại xe thành khoá DC
    { key: "fuelClassId", label: "Chủng loại xe (NL)", type: "select", optionsPath: "/vehicle-fuel-classes", width: "min-w-[190px]" },
    { key: "vehicleTypeId", label: "Chủng loại xe", type: "select", optionsPath: "/vehicle-types", width: "min-w-[180px]" },
    { key: "vehicleRankId", label: "Hạng xe/máy", type: "select", optionsPath: "/vehicle-ranks", width: "min-w-[130px]" },
    { key: "categoryClassId", label: "Chủng loại xe + Phân loại", type: "select", optionsPath: "/vehicle-category-classes", width: "min-w-[200px]" },
    { key: "qualityLevel", label: "Chất lượng", type: "text", width: "min-w-[140px]" },
    { key: "carRenovation", label: "Cải tạo toa", type: "text", width: "min-w-[140px]" },
  ],
};

export const machineProductionAttrConfig: CatalogConfig = {
  basePath: "/device-production-attributes",
  title: "Thuộc tính sản lượng — Máy xúc",
  nounPhrase: "thuộc tính sản lượng của máy xúc",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm theo mã máy, máy",
  uniqueCodeKey: null,
  labelKey: "code",
  canCreate: false,
  canDelete: false,
  fixedValues: { categoryGroup: "MAY" },
  guideNotes: [
    "- File nhập THAY THẾ toàn bộ thuộc tính sản lượng của thiết bị, không phải bổ sung.",
    "- Cách an toàn: chọn dòng trong bảng rồi Tải xuống, sửa trên chính file đó, rồi Tải lên.",
  ],
  fields: [
    ...deviceIdentityFields,
    // Máy xúc chỉ cần gầu xúc; hạng xe / chủng loại xe là chuyện của xe tải.
    { key: "bucketCapacity", label: "Gầu xúc", type: "number", width: "min-w-[130px]" },
  ],
};

// ── Ca làm việc, Xe, Máy (CRUD tay; backend /api/shifts, /api/devices) ─────────────────────────────

export const shiftConfig: CatalogConfig = {
  basePath: "/shifts",
  title: "Ca làm việc",
  nounPhrase: "ca làm việc",
  breadcrumb: ["Danh mục", "Danh mục khác"],
  searchPlaceholder: "Tìm kiếm ca làm việc",
  description: "Quản lý danh mục ca làm việc và thời gian bắt đầu, kết thúc",
  canExcel: false,
  labelKey: "name",
  designWidths: [160, 220, 220],
  fields: [
    { key: "name", label: "Ca", required: true, type: "number", width: "min-w-[120px]" },
    { key: "startTime", label: "Giờ bắt đầu", type: "text", placeholder: "HH:mm, vd 06:00", width: "min-w-[140px]" },
    { key: "endTime", label: "Giờ kết thúc", type: "text", placeholder: "HH:mm, vd 14:00", width: "min-w-[140px]" },
  ],
};

const DEVICE_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Chờ điều động" },
  { value: "IN_USE", label: "Đang hoạt động" },
  { value: "MAINTENANCE", label: "SC; BD" },
  { value: "BROKEN", label: "Hỏng" },
  { value: "RETIRED", label: "Niêm cất" },
];

// Cột gộp từ màn "Thuộc tính sản lượng" (2026-11-09): Mã thiết bị = Biển số, Tên thiết bị = Tên xe/máy, Đơn vị quản lý = Đơn vị
// → chỉ giữ một cột; các cột chưa có (Chủng loại xe NL, Chủng loại xe, Hạng xe, Chủng loại xe + Phân loại, Chất lượng,
// Cải tạo toa, Gầu xúc) được thêm vào đây. Backend ghi qua DeviceService.applyProductionAttributes theo `categoryGroup`.
const deviceFields = (kind: "XE" | "MAY"): CatalogField[] => [
  // "Số xe/Số máy" = gộp cột Biển số (mã thiết bị, khóa) và cột Số xe cũ: hiển thị Số xe, trống thì lấy mã; mã chỉ đặt lúc thêm mới.
  { key: "vehicleNumber", label: kind === "XE" ? "Số xe" : "Số máy", required: true, type: "text", width: "min-w-[130px]" },
  { key: "name", label: kind === "XE" ? "Tên xe" : "Tên máy", type: "text", width: "min-w-[180px]" },

  // Màn Xe không hiển thị Loại xe / Chủng loại (2026-11-09). Màn Máy: gộp Loại máy + Chủng loại thành MỘT cột "Chủng loại máy" (dữ liệu: 126/126 máy có loại, 0 máy có chủng loại).
  ...(kind === "MAY"
    ? ([
        { key: "categoryId", label: "Chủng loại máy", type: "select", optionsPath: "/device-types", optionsParams: { group: kind }, width: "min-w-[160px]" },
        { key: "vehicleRankId", label: "Hạng xe/máy", type: "select", optionsPath: "/vehicle-ranks", width: "min-w-[130px]" },
        { key: "bucketId", label: "Gầu xúc", type: "select", optionsPath: "/excavator-buckets", width: "min-w-[150px]" },
      ] as CatalogField[])
    : []),
  ...(kind === "XE"
    ? ([
        { key: "fuelClassId", label: "Chủng loại xe (NL)", type: "select", optionsPath: "/vehicle-fuel-classes", width: "min-w-[190px]" },
        { key: "vehicleTypeId", label: "Chủng loại xe", type: "select", optionsPath: "/vehicle-types", width: "min-w-[180px]" },
        { key: "categoryClassId", label: "Chủng loại xe + Phân loại", type: "select", optionsPath: "/vehicle-category-classes", width: "min-w-[210px]" },
        { key: "vehicleRankId", label: "Hạng xe/máy", type: "select", optionsPath: "/vehicle-ranks", width: "min-w-[130px]" },
        {
          key: "qualityLevel",
          label: "Chất lượng",
          type: "select",
          options: [
            { value: "A", label: "A" },
            { value: "B", label: "B" },
            { value: "C", label: "C" },
          ],
          width: "min-w-[140px]",
        },
        // Tick = "CaiToa" (đúng giá trị mà FuelCalculator.carRenovationFactor nhận ra); bỏ tick = để trống
        { key: "carRenovation", label: "Cải tạo toa", type: "checkbox", checkedValue: "CaiToa", width: "min-w-[140px]" },
      ] as CatalogField[])
    : []),
  { key: "fuelType", label: "Nhiên liệu", type: "text", width: "min-w-[110px]" },
  ...(kind === "XE" ? ([{ key: "capacity", label: "Trọng tải", type: "number", width: "min-w-[100px]" }] as CatalogField[]) : []),
  { key: "departmentId", label: "Đơn vị quản lý", type: "select", optionsPath: "/departments", width: "min-w-[170px]" },
  { key: "cumulativeHours", label: "Giờ hoạt động lũy kế", type: "number", readOnly: true, width: "min-w-[170px]" },
  { key: "status", label: "Trạng thái", type: "select", options: DEVICE_STATUS_OPTIONS, width: "min-w-[140px]" },
];

export const vehicleConfig: CatalogConfig = {
  basePath: "/devices",
  title: "Xe",
  nounPhrase: "xe",
  breadcrumb: ["Danh mục", "Thiết bị"],
  searchPlaceholder: "Tìm kiếm xe",
  description: "Quản lý danh mục xe, gồm cả thuộc tính sản lượng: chủng loại xe, hạng xe, chất lượng, cải tạo toa",
  canExcel: false,
  labelKey: "vehicleNumber",
  valueFallbacks: { vehicleNumber: "code" },
  deviceHoursByCode: true,
  uniqueCodeKey: "vehicleNumber",
  fixedValues: { categoryGroup: "XE" },
  fields: deviceFields("XE"),
};

export const machineConfig: CatalogConfig = {
  basePath: "/devices",
  title: "Máy",
  nounPhrase: "máy",
  breadcrumb: ["Danh mục", "Thiết bị"],
  searchPlaceholder: "Tìm kiếm máy",
  description: "Quản lý danh mục máy xúc và các thuộc tính phục vụ tính sản lượng",
  canExcel: false,
  labelKey: "vehicleNumber",
  valueFallbacks: { vehicleNumber: "code" },
  deviceHoursByCode: true,
  uniqueCodeKey: "vehicleNumber",
  fixedValues: { categoryGroup: "MAY" },
  fields: deviceFields("MAY"),
};
