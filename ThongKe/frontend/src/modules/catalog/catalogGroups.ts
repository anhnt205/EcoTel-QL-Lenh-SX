/**
 * Nhóm của từng danh mục trong menu "Danh mục" (bố cục chủ dự án chốt 2026-11-09, khớp
 * WebApp/Frontend/src/layout/thongkeMenu.ts bên Điều phối) — dùng cho đường dẫn (breadcrumb):
 * Danh mục > <nhóm> > <tên danh mục>.
 *
 * Khoá = `config.title`. Danh mục không có ở đây (Phân loại, Chủng loại xe + Phân loại...) rơi về
 * `config.breadcrumb` cũ.
 */
export const CATALOG_GROUP_BY_TITLE: Record<string, { group: string; label?: string }> = {
  // Loại hàng
  "Chủng loại hàng": { group: "Loại hàng" },
  "Nhóm chủng loại hàng": { group: "Loại hàng" },
  "Sản phẩm nghiệm thu": { group: "Loại hàng" },
  "TTL CLH": { group: "Loại hàng" },
  "Tỷ trọng": { group: "Loại hàng" },
  // Vị trí
  "Nơi nhận tải": { group: "Vị trí" },
  "Nơi dỡ tải": { group: "Vị trí" },
  "Nơi chất tải": { group: "Vị trí" },
  "Khu vực xúc": { group: "Vị trí" },
  "Nhóm vỉa": { group: "Vị trí" },
  // Thiết bị
  "Chủng loại xe": { group: "Thiết bị" },
  "Chủng loại xe + DMNL": { group: "Thiết bị" },
  "Xe": { group: "Thiết bị" },
  "Máy": { group: "Thiết bị" },
  "Hạng xe": { group: "Thiết bị" },
  "Nhóm hạng xe": { group: "Thiết bị" },
  // Số Trắc địa
  "STD (Đất CN)": { group: "Số Trắc địa" },
  "STD (Đất SX/Than SX)": { group: "Số Trắc địa" },
  // Danh mục khác
  "Hệ số": { group: "Danh mục khác", label: "Hệ số điều chỉnh" },
  "Kỳ báo cáo": { group: "Danh mục khác" },
  "Ca làm việc": { group: "Danh mục khác" },
};

/** Đường dẫn hiển thị cho 1 danh mục: `trail` = các mục cha (Danh mục, nhóm), `leaf` = tên trang. */
export function catalogBreadcrumbTrail(config: {
  title: string;
  breadcrumb: string[];
}): { trail: string[]; leaf: string } {
  const hit = CATALOG_GROUP_BY_TITLE[config.title];
  if (!hit) return { trail: config.breadcrumb, leaf: config.title };
  return { trail: ["Danh mục", hit.group], leaf: hit.label ?? config.title };
}
