import type { CatalogConfig } from "./types";

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
