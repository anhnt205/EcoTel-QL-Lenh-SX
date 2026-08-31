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
  searchPlaceholder: "Tìm kiếm theo mã khu vực xúc, tên khu vực xúc",
  fields: placeFields("khu vực xúc"),
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
    { key: "seamGroup", label: "Nhóm vỉa", required: true, type: "select", optionsFrom: "seam-groups", width: "min-w-[140px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[180px]" },
  ],
};

export const unloadingPointConfig: CatalogConfig = {
  basePath: "/unloading-points",
  title: "Nơi dỡ tải",
  nounPhrase: "nơi dỡ tải",
  breadcrumb: ["Danh mục", "Khai thác"],
  searchPlaceholder: "Tìm kiếm theo mã nơi dỡ tải, tên nơi dỡ tải",
  fields: placeFields("nơi dỡ tải"),
};

export const pickupPointConfig: CatalogConfig = {
  basePath: "/pickup-points",
  title: "Nơi chất tải",
  nounPhrase: "nơi chất tải",
  breadcrumb: ["Danh mục", "Khai thác"],
  searchPlaceholder: "Tìm kiếm theo mã nơi chất tải, tên nơi chất tải",
  fields: placeFields("nơi chất tải"),
};

export const cargoTypeConfig: CatalogConfig = {
  basePath: "/cargo-types",
  title: "Chủng loại hàng",
  nounPhrase: "chủng loại hàng",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã chủng loại hàng, tên chủng loại hàng",
  fields: [
    { key: "code", label: "Mã chủng loại hàng", required: true, type: "text", width: "min-w-[150px]" },
    { key: "name", label: "Chủng loại hàng", required: true, type: "text", width: "min-w-[150px]" },
    { key: "cargoGroupId", label: "Nhóm chủng loại hàng", required: true, type: "select", optionsPath: "/cargo-groups", width: "min-w-[170px]" },
    { key: "acceptanceProduct", label: "Sản phẩm nghiệm thu", type: "select", optionsFrom: "acceptance-products", width: "min-w-[160px]" },
    { key: "ttlClh", label: "TTL CLH", type: "select", optionsFrom: "ttl-clh", width: "min-w-[120px]" },
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
  searchPlaceholder: "Tìm kiếm theo mã nhóm, tên nhóm chủng loại hàng",
  fields: [
    { key: "code", label: "Mã nhóm chủng loại hàng", required: true, type: "text", width: "min-w-[190px]" },
    { key: "name", label: "Nhóm chủng loại hàng", required: true, type: "text", width: "min-w-[180px]" },
    { key: "description", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const acceptanceProductConfig: CatalogConfig = {
  basePath: "/acceptance-products",
  title: "Sản phẩm nghiệm thu",
  nounPhrase: "sản phẩm nghiệm thu",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã, tên sản phẩm nghiệm thu",
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
  searchPlaceholder: "Tìm kiếm theo mã nhóm vỉa, tên nhóm vỉa",
  fields: [
    { key: "code", label: "Mã nhóm vỉa", required: true, type: "text", width: "min-w-[170px]" },
    { key: "name", label: "Nhóm vỉa", required: true, type: "text", width: "min-w-[170px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const vehicleFuelClassConfig: CatalogConfig = {
  basePath: "/vehicle-fuel-classes",
  title: "Chủng loại xe + DMNL",
  nounPhrase: "chủng loại xe + DMNL",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã, tên chủng loại xe + DMNL",
  fields: [
    { key: "code", label: "Mã chủng loại xe + DMNL", required: true, type: "text", width: "min-w-[200px]" },
    { key: "name", label: "Chủng loại xe + DMNL", required: true, type: "text", width: "min-w-[190px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

export const vehicleCategoryClassConfig: CatalogConfig = {
  basePath: "/vehicle-category-classes",
  title: "Chủng loại xe + Phân loại",
  nounPhrase: "chủng loại xe + phân loại",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm kiếm theo mã, tên chủng loại xe + phân loại",
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
  searchPlaceholder: "Tìm kiếm theo mã hệ số, tên hệ số",
  fields: [
    { key: "code", label: "Mã hệ số", required: true, type: "text", width: "min-w-[150px]" },
    { key: "name", label: "Tên hệ số", required: true, type: "text", width: "min-w-[200px]" },
    { key: "value", label: "Giá trị", required: true, type: "number", width: "min-w-[120px]" },
    { key: "note", label: "Ghi chú", type: "text", width: "min-w-[200px]" },
  ],
};

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
    { key: "coalTkm", label: "Than SX (Tkm)", type: "number", width: "min-w-[140px]" },
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
  ],
  fields: [
    ...deviceIdentityFields,
    { key: "vehicleNumber", label: "Số xe", type: "text", readOnly: true, width: "min-w-[120px]" },
    { key: "fuelClassId", label: "Chủng loại xe + DMNL", type: "select", optionsPath: "/vehicle-fuel-classes", width: "min-w-[190px]" },
    { key: "categoryClassId", label: "Chủng loại xe + Phân loại", type: "select", optionsPath: "/vehicle-category-classes", width: "min-w-[200px]" },
    { key: "vehicleClass", label: "Hạng xe", type: "text", placeholder: "A / B / C1 / khác", width: "min-w-[130px]" },
    { key: "qualityLevel", label: "Chất lượng", type: "text", width: "min-w-[140px]" },
    { key: "carRenovation", label: "Cải tạo toa", type: "text", width: "min-w-[140px]" },
  ],
};

export const machineProductionAttrConfig: CatalogConfig = {
  basePath: "/device-production-attributes",
  title: "Thuộc tính sản lượng — Máy xúc",
  nounPhrase: "thuộc tính sản lượng của máy xúc",
  breadcrumb: ["Danh mục", "Thống kê sản lượng"],
  searchPlaceholder: "Tìm theo mã máy, tên máy",
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
