// Menu của phần mềm Thống kê (THONGKE-CAOSON) hiển thị trong header Điều phối.
//
// `to` là đường dẫn BÊN TRONG ứng dụng Thống kê (không có tiền tố) — lấy từ
// THONGKE-CAOSON/frontend/src/constants/routes.ts và layouts/catalog-menu.ts.
// Khi Thống kê thêm/đổi route thì sửa ở đây cho khớp. Điều phối chỉ chứa
// trang nhúng `/tk/*` -> khung iframe `/thong-ke/*`, không biết nội dung trang.
//
// Mỗi mục gắn với 1 `module` phân quyền (khớp Backend/config/modules.js): người đã được cấu hình quyền mới chỉ
// thấy mục mình có quyền Xem; người chưa cấu hình thấy theo vai trò cũ (admin/manager/dispatcher).

import { allowModule } from "../permissions/access";

export interface TkMenuItem {
  text: string;
  to: string;
  /** khoá module phân quyền */
  module: string;
  /** trang riêng của Điều phối (không phải trang nhúng /tk/...); mặc định tkPageRoute(to) */
  route?: string;
  /** hiện khi có quyền Xem ở BẤT KỲ module nào trong danh sách (mặc định chỉ `module`) */
  anyModule?: string[];
}

export interface TkMenuGroup {
  label: string;
  items: TkMenuItem[];
}

const TK_LEGACY_ROLES = ["admin", "manager", "dispatcher"] as const;
/** Nhóm do Điều phối quản lý hẳn (phòng ban, chức vụ, nhân viên, công việc, biện pháp an toàn). */
const UNIT_GROUP_LABEL = "Đơn vị";

/** Thứ tự nhóm trong menu Danh mục gộp (nhóm rỗng sau khi lọc quyền bị bỏ). */
const MERGED_GROUP_ORDER = [
  "Loại hàng",
  "Vị trí",
  "Thiết bị",
  "Số Trắc địa",
  UNIT_GROUP_LABEL,
  "Danh mục khác",
] as const;

// Các mục cấp cao nhất (không nằm trong nhóm danh mục).
export const TK_TOP_ITEMS: TkMenuItem[] = [
  { text: "Nhập liệu Khai thác", to: "/nhap-lieu/khai-thac", module: "tk-entry-mining" },
  { text: "Nhập liệu Vận tải", to: "/nhap-lieu/van-tai", module: "tk-entry-transport" },
  // "Định mức nhiên liệu" và "Áp Trắc địa" nay nằm TRONG menu Danh mục (nhóm Thiết bị / Số Trắc địa) — chủ dự án chốt 2026-11-09.
  { text: "Đối chiếu", to: "/nhap-lieu/doi-chieu", module: "tk-reconciliation" },
  // Trang 2 tab (Sản lượng thống kê | Báo chuyến) — xem pages/thongke/OutputStats.tsx
  {
    text: "Thống kê sản lượng",
    to: "/bao-cao/thong-ke",
    module: "tk-stat-report",
    route: "/thong-ke-san-luong",
    anyModule: ["tk-stat-report", "tk-trip-report"],
  },
];

// Nhóm "Danh mục" của Thống kê — danh mục gốc dùng chung, Điều phối chỉ giữ bản sao chỉ-đọc.
// KHÔNG gồm Phòng ban / Chức vụ / Tài khoản: ba mục này Điều phối quản lý hẳn (kèm phân quyền).
// Bố cục nhóm/thứ tự do chủ dự án chốt 2026-11-09 (xem MERGED_GROUP_ORDER bên dưới cho thứ tự nhóm).
export const TK_CATALOG_GROUPS: TkMenuGroup[] = [
  {
    label: "Loại hàng",
    items: [
      { text: "Chủng loại hàng", to: "/danh-muc/chung-loai-hang", module: "tk-cargo-types" },
      { text: "Nhóm chủng loại hàng", to: "/danh-muc/nhom-chung-loai-hang", module: "tk-cargo-groups" },
      { text: "Phân loại", to: "/danh-muc/phan-loai", module: "tk-classifications" },
      { text: "Ký hiệu bùn", to: "/danh-muc/ky-hieu-bun", module: "tk-mud-marks" },
      { text: "Sản phẩm nghiệm thu", to: "/danh-muc/san-pham-nghiem-thu", module: "tk-acceptance-products" },
      { text: "TTL CLH", to: "/danh-muc/ttl-clh", module: "tk-ttl-clh" },
      { text: "Mô hình", to: "/danh-muc/mo-hinh", module: "tk-model-periods" },
      { text: "Tỷ trọng", to: "/danh-muc/ty-trong", module: "tk-density" },
    ],
  },
  {
    label: "Vị trí",
    items: [
      { text: "Nơi nhận tải", to: "/danh-muc/noi-nhan-tai", module: "tk-receiving-points" },
      { text: "Nơi dỡ tải", to: "/danh-muc/noi-do-tai", module: "tk-unloading-points" },
      { text: "Nơi chất tải", to: "/danh-muc/noi-chat-tai", module: "tk-pickup-points" },
      { text: "Khu vực xúc", to: "/danh-muc/khu-vuc-xuc", module: "tk-excavation-areas" },
      { text: "Nhóm vỉa", to: "/danh-muc/nhom-via", module: "tk-seam-groups" },
    ],
  },
  {
    label: "Thiết bị",
    items: [
      { text: "Xe", to: "/danh-muc/thong-tin-xe", module: "tk-devices-vehicle" },
      { text: "Máy", to: "/danh-muc/thong-tin-may", module: "tk-devices-machine" },
      { text: "Chủng loại xe", to: "/danh-muc/chung-loai-xe", module: "tk-vehicle-types" },
      { text: "Chủng loại xe + DMNL", to: "/danh-muc/chung-loai-xe-dmnl", module: "tk-fuel-classes" },
      { text: "Hạng xe", to: "/danh-muc/hang-xe", module: "tk-vehicle-ranks" },
      { text: "Nhóm hạng xe", to: "/danh-muc/nhom-hang-xe", module: "tk-vehicle-rank-groups" },
      { text: "Năng suất xe", to: "/danh-muc/nang-suat-xe", module: "tk-matrix-996" },
      { text: "Định mức nhiên liệu", to: "/danh-muc/dinh-muc-nhien-lieu", module: "tk-fuel-norm" },
    ],
  },
  {
    label: "Số Trắc địa",
    items: [
      { text: "STD (Đất CN)", to: "/danh-muc/std-dat-cn", module: "tk-std-industrial" },
      { text: "STD (Đất SX/Than SX)", to: "/danh-muc/std-dat-sx-than-sx", module: "tk-std-production" },
      { text: "Áp Trắc địa", to: "/danh-muc/ap-tracdia", module: "tk-survey" },
    ],
  },
  {
    label: "Danh mục khác",
    items: [
      { text: "Hệ số điều chỉnh", to: "/danh-muc/he-so", module: "tk-coefficients" },
      { text: "Hệ số điều chỉnh DMNL", to: "/danh-muc/hs-dieu-chinh-nldm", module: "tk-matrix-nldm" },
      { text: "Kỳ báo cáo", to: "/danh-muc/ky-bao-cao", module: "tk-report-periods" },
      { text: "Ca làm việc", to: "/danh-muc/ca-lam-viec", module: "tk-shifts" },
      { text: "Hậu tố", to: "/danh-muc/hau-to", module: "tk-suffixes" },
    ],
  },
];

/** Đường dẫn trang Điều phối chứa khung nhúng của 1 trang Thống kê. */
export const TK_ROUTE_PREFIX = "/tk";
export const tkPageRoute = (to: string) => `${TK_ROUTE_PREFIX}${to}`;

/** Đường dẫn ứng dụng Thống kê thật (reverse proxy) dùng làm src của iframe. */
export const TK_APP_PREFIX = "/thong-ke";

/**
 * Các đường dẫn danh mục Điều phối đã chuyển sang Thống kê (ẩn khỏi menu cũ khi nhúng). Phòng ban và Chức vụ
 * KHÔNG còn trong danh sách: Điều phối quản lý hẳn hai danh mục này.
 */
export const CATALOG_PATHS_MOVED_TO_TK = ["/shifts", "/deviceTypes", "/deviceModels"];

// ---------------------------------------------------------------------------
// Bố cục menu khi nhúng (giống PM Thống kê): các mục Thống kê nằm NGOÀI thanh
// menu; "Danh mục" của Thống kê GỘP CHUNG với "Danh mục" của Điều phối thành
// MỘT menu "Danh mục" duy nhất.
//
// Thanh menu: Tổng quan | Lệnh sản xuất | [Công việc của tôi] |
//   Nhập liệu Khai thác | Nhập liệu Vận tải | DANH MỤC (gộp, gồm Định mức nhiên liệu và Áp Trắc địa) |
//   Đối chiếu | Thống kê sản lượng | Báo cáo | Hệ thống
// ---------------------------------------------------------------------------

/** Mục Thống kê đứng TRƯỚC menu Danh mục (theo thứ tự thanh menu của PM Thống kê). */
export const TK_NAV_BEFORE_CATALOG: TkMenuItem[] = TK_TOP_ITEMS.filter((i) =>
  ["/nhap-lieu/khai-thac", "/nhap-lieu/van-tai"].includes(i.to),
);
// "Thống kê sản lượng" đứng ngoài thanh menu, mở trang có 2 tab: "Sản lượng thống kê" (báo cáo thống kê) và
// "Báo chuyến" (xem pages/thongke/OutputStats.tsx).
export const TK_OUTPUT_ROUTE = "/thong-ke-san-luong";
export const TK_OUTPUT_TABS = [
  { key: "san-luong", label: "Sản lượng thống kê", to: "/bao-cao/thong-ke", module: "tk-stat-report" },
  { key: "bao-chuyen", label: "Báo chuyến", to: "/nhap-lieu/bao-chuyen", module: "tk-trip-report" },
] as const;
export const TK_REPORT_MODULE = "tk-stat-report";
/** Mục Thống kê đứng SAU menu Danh mục. */
export const TK_NAV_AFTER_CATALOG: TkMenuItem[] = TK_TOP_ITEMS.filter((i) => !TK_NAV_BEFORE_CATALOG.includes(i));

export interface MergedCatalogItem {
  text: string;
  /** đường dẫn đích trong ứng dụng Điều phối (đã gồm tiền tố /tk với trang Thống kê) */
  path: string;
  source: "thongke" | "dieuphoi";
  module: string;
}

export interface MergedCatalogGroup {
  label: string;
  items: MergedCatalogItem[];
}

interface DpmmCatalogItem {
  text: string;
  path: string;
  module: string;
  /** vai trò Điều phối được thấy mục này khi người dùng CHƯA được cấu hình quyền mới (hành vi cũ) */
  roles: readonly string[];
}

const ADM = ["admin", "manager"] as const;
const ADM_DISP = ["admin", "manager", "dispatcher"] as const;

/**
 * Các mục danh mục do ĐIỀU PHỐI quản lý, xếp theo nhóm (khoá = tên nhóm). Bố cục chốt 2026-11-09:
 *  - nhóm "Đơn vị": Phòng ban, Chức vụ, Nhân viên, Công việc, Biện pháp an toàn;
 *  - các mục vận hành trùng tên với mục Thống kê (Vật liệu, Điểm đổ tải, Xe/Máy trạng thái vị trí, Cung độ, Mô hình xe)
 *    không có trong bố cục chốt nên gom tạm xuống nhóm cuối, nhãn ghi "(Điều phối)" để không nhầm.
 */
const DPMM_GROUP_ITEMS: Record<string, DpmmCatalogItem[]> = {
  [UNIT_GROUP_LABEL]: [
    { text: "Phòng ban", path: "/departments", module: "departments", roles: ADM_DISP },
    { text: "Chức vụ", path: "/positions", module: "positions", roles: ADM },
    { text: "Nhân viên", path: "/users", module: "users", roles: ADM_DISP },
    { text: "Công việc", path: "/jobs", module: "jobs", roles: ADM },
    { text: "Biện pháp an toàn", path: "/safetyMeasures", module: "safety-measures", roles: ADM },
  ],
};

const dpmmItem = (i: DpmmCatalogItem): MergedCatalogItem => ({
  text: i.text,
  path: i.path,
  module: i.module,
  source: "dieuphoi",
});

/**
 * Menu "Danh mục" gộp, đã lọc theo quyền của người dùng (`user`: kết quả /auth/me gồm role, permissionMode,
 * permissions). Nhóm rỗng bị bỏ. Thứ tự nhóm theo MERGED_GROUP_ORDER; trong mỗi nhóm mục Thống kê đứng trước,
 * mục Điều phối đứng sau.
 */
export function buildMergedCatalog(user: any): MergedCatalogGroup[] {
  const groups: MergedCatalogGroup[] = MERGED_GROUP_ORDER.map((label) => {
    const tk: MergedCatalogItem[] = (TK_CATALOG_GROUPS.find((g) => g.label === label)?.items ?? [])
      .filter((i) => allowModule(user, i.module, TK_LEGACY_ROLES))
      .map((i) => ({ text: i.text, path: tkPageRoute(i.to), source: "thongke" as const, module: i.module }));
    const dp: MergedCatalogItem[] = (DPMM_GROUP_ITEMS[label] ?? [])
      .filter((i) => allowModule(user, i.module, i.roles))
      .map(dpmmItem);
    return { label, items: [...tk, ...dp] };
  });
  return groups.filter((g) => g.items.length > 0);
}

/** Có thấy mục Thống kê `module` không (menu ngoài thanh menu và tab Báo cáo thống kê). */
export const canSeeTkModule = (user: any, module: string) => allowModule(user, module, TK_LEGACY_ROLES);

/** Có thấy mục menu `item` không (theo `anyModule` nếu có, không thì theo `module`). */
export const canSeeTkItem = (user: any, item: TkMenuItem) =>
  (item.anyModule || [item.module]).some((m) => canSeeTkModule(user, m));

/** Có thấy ít nhất một màn Thống kê không (dùng để quyết định hiện khung nhúng). */
export const canSeeThongKe = (user: any) =>
  [...TK_TOP_ITEMS, ...TK_CATALOG_GROUPS.flatMap((g) => g.items)].some((i) => canSeeTkItem(user, i));
