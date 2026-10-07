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
  { text: "Đối chiếu", to: "/nhap-lieu/doi-chieu" },
  { text: "Báo chuyến", to: "/nhap-lieu/bao-chuyen" },
  { text: "Định mức nhiên liệu", to: "/danh-muc/dinh-muc-nhien-lieu" },
  { text: "Áp Trắc Địa", to: "/danh-muc/ap-tracdia" },
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
