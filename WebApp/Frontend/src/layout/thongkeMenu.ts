// Menu của phần mềm Thống kê (THONGKE-CAOSON) hiển thị trong header Điều phối.
//
// `to` là đường dẫn BÊN TRONG ứng dụng Thống kê (không có tiền tố) — lấy từ
// THONGKE-CAOSON/frontend/src/constants/routes.ts và layouts/catalog-menu.ts.
// Khi Thống kê thêm/đổi route thì sửa ở đây cho khớp. Điều phối chỉ chứa
// trang nhúng `/tk/*` -> khung iframe `/thong-ke/*`, không biết nội dung trang.

export interface TkMenuItem {
  text: string;
  to: string;
  /** chỉ hiện cho quản trị viên Điều phối */
  adminOnly?: boolean;
}

export interface TkMenuGroup {
  label: string;
  items: TkMenuItem[];
}

// Các mục cấp cao nhất (không nằm trong nhóm danh mục).
export const TK_TOP_ITEMS: TkMenuItem[] = [
  { text: "Nhập liệu Khai thác", to: "/nhap-lieu/khai-thac" },
  { text: "Nhập liệu Vận tải", to: "/nhap-lieu/van-tai" },
  { text: "Định mức nhiên liệu", to: "/danh-muc/dinh-muc-nhien-lieu" },
  { text: "Áp Trắc Địa", to: "/danh-muc/ap-tracdia" },
  { text: "Đối chiếu", to: "/nhap-lieu/doi-chieu" },
  { text: "Báo chuyến", to: "/nhap-lieu/bao-chuyen" },
  { text: "Báo cáo thống kê", to: "/bao-cao/thong-ke" },
];

// Nhóm "Danh mục" — danh mục gốc dùng chung, Điều phối chỉ giữ bản sao chỉ-đọc.
export const TK_CATALOG_GROUPS: TkMenuGroup[] = [
  {
    label: "Vật liệu, hàng hoá",
    items: [
      { text: "Chủng loại hàng", to: "/danh-muc/chung-loai-hang" },
      { text: "Nhóm chủng loại hàng", to: "/danh-muc/nhom-chung-loai-hang" },
      { text: "Sản phẩm nghiệm thu", to: "/danh-muc/san-pham-nghiem-thu" },
    ],
  },
  {
    label: "Vị trí",
    items: [
      { text: "Nơi nhận tải", to: "/danh-muc/noi-nhan-tai" },
      { text: "Nơi dỡ tải", to: "/danh-muc/noi-do-tai" },
      { text: "Nơi chất tải", to: "/danh-muc/noi-chat-tai" },
      { text: "Khu vực xúc", to: "/danh-muc/khu-vuc-xuc" },
    ],
  },
  {
    label: "Thiết bị",
    items: [
      { text: "Thông tin xe", to: "/danh-muc/thong-tin-xe" },
      { text: "Thông tin máy", to: "/danh-muc/thong-tin-may" },
      { text: "Chủng loại xe", to: "/danh-muc/chung-loai-xe" },
      { text: "Nhóm hạng xe", to: "/danh-muc/nhom-hang-xe" },
      { text: "Hạng xe", to: "/danh-muc/hang-xe" },
    ],
  },
  {
    label: "Số trắc địa (STD)",
    items: [
      { text: "STD (Đất CN)", to: "/danh-muc/std-dat-cn" },
      { text: "STD (Đất SX/Than SX)", to: "/danh-muc/std-dat-sx-than-sx" },
    ],
  },
  {
    label: "Danh mục khác",
    items: [
      { text: "TTL CLH", to: "/danh-muc/ttl-clh" },
      { text: "Nhóm vỉa", to: "/danh-muc/nhom-via" },
      { text: "Chủng loại xe + DMNL", to: "/danh-muc/chung-loai-xe-dmnl" },
      { text: "Hệ số", to: "/danh-muc/he-so" },
      { text: "Kỳ báo cáo", to: "/danh-muc/ky-bao-cao" },
      { text: "Mô hình", to: "/danh-muc/mo-hinh" },
      { text: "Năng suất xe (996)", to: "/danh-muc/nang-suat-xe" },
      { text: "HS điều chỉnh NLĐM", to: "/danh-muc/hs-dieu-chinh-nldm" },
      { text: "Tỷ trọng", to: "/danh-muc/ty-trong" },
      { text: "Thuộc tính SL — Xe", to: "/danh-muc/thuoc-tinh-san-luong-xe" },
      { text: "Thuộc tính SL — Máy xúc", to: "/danh-muc/thuoc-tinh-san-luong-may" },
      { text: "Ca làm việc", to: "/danh-muc/ca-lam-viec" },
    ],
  },
  {
    label: "Danh mục Hệ thống",
    items: [
      { text: "Phòng ban", to: "/danh-muc/don-vi" },
      { text: "Chức vụ", to: "/danh-muc/chuc-vu" },
      // Tài khoản Thống kê riêng với tài khoản Điều phối (chủ dự án chốt) —
      // chỉ quản trị mới cần vào để cấp quyền Thống kê.
      { text: "Tài khoản Thống kê", to: "/danh-muc/nguoi-dung", adminOnly: true },
    ],
  },
];

/** Đường dẫn trang Điều phối chứa khung nhúng của 1 trang Thống kê. */
export const TK_ROUTE_PREFIX = "/tk";
export const tkPageRoute = (to: string) => `${TK_ROUTE_PREFIX}${to}`;

/** Đường dẫn ứng dụng Thống kê thật (reverse proxy) dùng làm src của iframe. */
export const TK_APP_PREFIX = "/thong-ke";

/** Các đường dẫn danh mục Điều phối đã chuyển sang Thống kê (ẩn khỏi menu Điều phối). */
export const CATALOG_PATHS_MOVED_TO_TK = [
  "/departments",
  "/positions",
  "/shifts",
  "/deviceTypes",
  "/deviceModels",
];

// ---------------------------------------------------------------------------
// Bố cục menu khi nhúng (giống PM Thống kê): các mục Thống kê nằm NGOÀI thanh
// menu; "Danh mục" của Thống kê GỘP CHUNG với "Danh mục" của Điều phối thành
// MỘT menu "Danh mục" duy nhất.
//
// Thanh menu: Tổng quan | Lệnh sản xuất | [Công việc của tôi] |
//   Nhập liệu Khai thác | Nhập liệu Vận tải | DANH MỤC (gộp) | Định mức nhiên liệu |
//   Áp Trắc Địa | Đối chiếu | Báo chuyến | Báo cáo (có tab "Báo cáo thống kê") | Hệ thống
// ---------------------------------------------------------------------------

/** Mục Thống kê đứng TRƯỚC menu Danh mục (theo thứ tự thanh menu của PM Thống kê). */
export const TK_NAV_BEFORE_CATALOG: TkMenuItem[] = TK_TOP_ITEMS.filter((i) =>
  ["/nhap-lieu/khai-thac", "/nhap-lieu/van-tai"].includes(i.to),
);
/** Mục Thống kê đứng SAU menu Danh mục. */
// "Báo cáo thống kê" KHÔNG đứng ngoài thanh menu: nằm trong menu "Báo cáo" dưới dạng tab
// (xem pages/reports/Reports.tsx).
export const TK_REPORT_ITEM_PATH = "/bao-cao/thong-ke";
export const TK_NAV_AFTER_CATALOG: TkMenuItem[] = TK_TOP_ITEMS.filter(
  (i) => !TK_NAV_BEFORE_CATALOG.includes(i) && i.to !== TK_REPORT_ITEM_PATH,
);

export interface MergedCatalogItem {
  text: string;
  /** đường dẫn đích trong ứng dụng Điều phối (đã gồm tiền tố /tk với trang Thống kê) */
  path: string;
  source: "thongke" | "dieuphoi";
}

export interface MergedCatalogGroup {
  label: string;
  items: MergedCatalogItem[];
}

interface DpmmCatalogItem {
  text: string;
  path: string;
  /** vai trò Điều phối được thấy mục này (giữ đúng phân quyền cũ của menu Danh mục) */
  roles: string[];
}

const ADM = ["admin", "manager"];
const ADM_DISP = ["admin", "manager", "dispatcher"];
const TK_ROLES = ADM_DISP; // quyền chi tiết trong Thống kê do chính Thống kê kiểm tra

/**
 * Các mục danh mục CHỈ Điều phối có (hoặc phần vận hành của danh mục dùng chung),
 * xếp vào nhóm tương ứng của Thống kê. Nhãn ghi rõ "(Điều phối)" ở mục vận hành
 * để không nhầm với mục cùng tên của Thống kê.
 */
const DPMM_EXTRAS: Record<string, DpmmCatalogItem[]> = {
  "Vật liệu, hàng hoá": [
    { text: "Vật liệu — tỷ trọng (Điều phối)", path: "/materials", roles: ADM },
  ],
  "Vị trí": [
    { text: "Điểm đổ tải — khoảng cách, toạ độ (Điều phối)", path: "/locations", roles: ADM },
  ],
  "Thiết bị": [
    { text: "Xe — trạng thái, vị trí (Điều phối)", path: "/vehicles", roles: ADM_DISP },
    { text: "Máy — trạng thái, vị trí (Điều phối)", path: "/machines", roles: ADM_DISP },
  ],
  "Danh mục Hệ thống": [
    { text: "Cán bộ nhân viên", path: "/users", roles: ADM_DISP },
  ],
};

/** Nhóm chỉ có ở Điều phối (giao ca, cung độ, mô hình). */
const DPMM_ONLY_GROUP: { label: string; items: DpmmCatalogItem[] } = {
  label: "Giao ca & vận hành (Điều phối)",
  items: [
    { text: "Công việc", path: "/jobs", roles: ADM },
    { text: "Biện pháp an toàn", path: "/safetyMeasures", roles: ADM },
    { text: "Cung độ", path: "/travelLog", roles: ADM },
    { text: "Mô hình xe", path: "/models", roles: ADM_DISP },
  ],
};

/**
 * Menu "Danh mục" gộp, đã lọc theo vai trò. Nhóm rỗng bị bỏ. Thứ tự nhóm theo
 * Thống kê, nhóm chỉ-Điều-phối đặt cuối.
 */
export function buildMergedCatalog(role: string | undefined): MergedCatalogGroup[] {
  const r = role || "";
  const isAdmin = r === "admin";
  const groups: MergedCatalogGroup[] = TK_CATALOG_GROUPS.map((g) => {
    const tk: MergedCatalogItem[] = TK_ROLES.includes(r)
      ? g.items
          .filter((i) => !i.adminOnly || isAdmin)
          .map((i) => ({ text: i.text, path: tkPageRoute(i.to), source: "thongke" as const }))
      : [];
    const dp: MergedCatalogItem[] = (DPMM_EXTRAS[g.label] || [])
      .filter((i) => i.roles.includes(r))
      .map((i) => ({ text: i.text, path: i.path, source: "dieuphoi" as const }));
    return { label: g.label, items: [...tk, ...dp] };
  });
  groups.push({
    label: DPMM_ONLY_GROUP.label,
    items: DPMM_ONLY_GROUP.items
      .filter((i) => i.roles.includes(r))
      .map((i) => ({ text: i.text, path: i.path, source: "dieuphoi" as const })),
  });
  return groups.filter((g) => g.items.length > 0);
}

/** Vai trò được thấy các mục menu của Thống kê (nhập liệu, đối chiếu, báo cáo...). */
export const canSeeThongKe = (role: string | undefined) => TK_ROLES.includes(role || "");
