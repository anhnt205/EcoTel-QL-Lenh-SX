import { ROUTES } from "@/constants/routes";

/**
 * Cấu trúc nhóm của menu "Danh mục" — chủ dự án chốt 2026-09-09.
 *
 * Trước đây 34 danh mục nằm phẳng một danh sách dài, phải cuộn mới tìm được.
 * Nay gom theo nhóm nghiệp vụ.
 *
 * Để Ở ĐÂY dưới dạng DỮ LIỆU thay vì viết thẳng JSX vì menu được render ở HAI
 * chỗ (thanh trên cùng cho màn rộng, và menu thu gọn cho màn hẹp) — trước đây
 * hai chỗ đó chép tay riêng nên rất dễ sửa một nơi quên nơi kia.
 */
export interface CatalogMenuItem {
  label: string;
  to: string;
}

export interface CatalogMenuGroup {
  label: string;
  items: CatalogMenuItem[];
}

export const CATALOG_MENU: CatalogMenuGroup[] = [
  {
    label: "Vật liệu, hàng hoá",
    items: [
      { label: "Nhóm hàng", to: ROUTES.DANH_MUC.NHOM_HANG },
      { label: "Chủng loại hàng", to: ROUTES.DANH_MUC.CHUNG_LOAI_HANG },
      { label: "Nhóm chủng loại hàng", to: ROUTES.DANH_MUC.NHOM_CHUNG_LOAI_HANG },
      { label: "Phân loại", to: ROUTES.DANH_MUC.PHAN_LOAI },
      { label: "Sản phẩm nghiệm thu", to: ROUTES.DANH_MUC.SAN_PHAM_NGHIEM_THU },
      { label: "Loại hàng", to: ROUTES.DANH_MUC.LOAI_HANG },
      { label: "Vật liệu", to: ROUTES.DANH_MUC.VAT_LIEU },
    ],
  },
  {
    label: "Vị trí",
    items: [
      { label: "Nơi nhận tải", to: ROUTES.DANH_MUC.NOI_NHAN_TAI },
      { label: "Nơi dỡ tải", to: ROUTES.DANH_MUC.NOI_DO_TAI },
      { label: "Nơi chất tải", to: ROUTES.DANH_MUC.NOI_CHAT_TAI },
      { label: "Khu vực xúc", to: ROUTES.DANH_MUC.KHU_VUC_XUC },
      { label: "Vị trí", to: ROUTES.DANH_MUC.DIEM_DO_TAI },
    ],
  },
  {
    label: "Thiết bị",
    items: [
      { label: "Thông tin xe", to: ROUTES.DANH_MUC.THONG_TIN_XE },
      { label: "Thông tin máy", to: ROUTES.DANH_MUC.THONG_TIN_MAY },
      { label: "Chủng loại xe", to: ROUTES.DANH_MUC.CHUNG_LOAI_XE },
      { label: "Nhóm hạng xe", to: ROUTES.DANH_MUC.NHOM_HANG_XE },
      { label: "Hạng xe", to: ROUTES.DANH_MUC.HANG_XE },
    ],
  },
  {
    label: "Số trắc địa (STD)",
    items: [
      { label: "STD (Đất CN)", to: ROUTES.DANH_MUC.STD_DAT_CN },
      { label: "STD (Đất SX/Than SX)", to: ROUTES.DANH_MUC.STD_DAT_SX },
    ],
  },
  {
    label: "Danh mục khác",
    items: [
      { label: "TTL CLH", to: ROUTES.DANH_MUC.TTL_CLH },
      { label: "Nhóm vỉa", to: ROUTES.DANH_MUC.NHOM_VIA },
      { label: "Chủng loại xe + DMNL", to: ROUTES.DANH_MUC.CHUNG_LOAI_XE_DMNL },
      { label: "Chủng loại xe + Phân loại", to: ROUTES.DANH_MUC.CHUNG_LOAI_XE_PHAN_LOAI },
      { label: "Hệ số", to: ROUTES.DANH_MUC.HE_SO },
      { label: "Kỳ báo cáo", to: ROUTES.DANH_MUC.KY_BAO_CAO },
      { label: "Mô hình", to: ROUTES.DANH_MUC.MO_HINH },
      { label: "Năng suất xe (996)", to: ROUTES.DANH_MUC.NANG_SUAT_XE },
      { label: "HS điều chỉnh NLĐM", to: ROUTES.DANH_MUC.HS_DIEU_CHINH_NLDM },
      { label: "Tỷ trọng", to: ROUTES.DANH_MUC.TY_TRONG },
      { label: "Thuộc tính SL — Xe", to: ROUTES.DANH_MUC.TTSL_XE },
      { label: "Thuộc tính SL — Máy xúc", to: ROUTES.DANH_MUC.TTSL_MAY },
      { label: "Đơn vị", to: ROUTES.DANH_MUC.DON_VI },
      { label: "Ca làm việc", to: ROUTES.DANH_MUC.CA_LAM_VIEC },
      { label: "Người dùng & Lái xe", to: ROUTES.DANH_MUC.NGUOI_DUNG },
    ],
  },
];
