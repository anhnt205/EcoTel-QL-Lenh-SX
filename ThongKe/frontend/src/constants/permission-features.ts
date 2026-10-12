/**
 * Nhãn tiếng Việt + cách nhóm cho 34 resource quyền (khớp đúng
 * `PermissionResources.ALL` phía backend) — dùng ở màn "Danh mục Hệ thống"
 * (Phòng ban chọn chức năng được phép dùng, Chức vụ phân quyền C/R/U/D/A).
 * Chủ dự án chốt 2026-09-10: hiển thị theo ĐÚNG cấu trúc menu thật của app
 * (8 mục trên thanh nav), không hiện thẳng resource key kỹ thuật tiếng Anh
 * — riêng mục "Danh mục" (vốn là 1 dropdown chứa rất nhiều danh mục con)
 * phải trải chi tiết từng danh mục con ra, khớp `layouts/catalog-menu.ts`.
 *
 * Vài resource phục vụ NHIỀU vị trí menu cùng lúc (backend chỉ có 1 quyền,
 * frontend có nhiều trang dùng chung) — cố ý hiển thị NHIỀU dòng checkbox
 * cùng trỏ vào 1 `resource`, để khớp đúng số lượng mục người dùng thấy trên
 * menu thật; các dòng cùng resource LUÔN tích/bỏ tích đồng thời (cùng 1 ô
 * trong `Set`/response `allowedResources`) — có ghi chú `sharedWith` để giao
 * diện hiện chú thích, tránh nhìn như lỗi khi 2 dòng "tự nhiên" đổi cùng lúc:
 * - `production`: "Áp Trắc Địa" (mục nav riêng) và "Báo cáo thống kê" (tính
 *   sản lượng, bấm "Tính lại kỳ").
 * - `reconciliation`: "Đối chiếu" và "Báo chuyến" (Báo chuyến vốn chỉ là
 *   view lọc theo trạng thái của cùng dữ liệu đối chiếu, không có quyền
 *   riêng — xem `ReconciliationController`).
 * - `matrix-catalogs`: "Định mức nhiên liệu" (mục nav riêng) và 2 danh mục
 *   con "Năng suất xe (996)"/"HS điều chỉnh NLĐM" trong dropdown Danh mục.
 * - `devices`, `device-production-attributes`, `survey-standards`: mỗi
 *   resource có 2 trang riêng trong dropdown Danh mục (vd Thông tin xe /
 *   Thông tin máy) — cùng lý do, hiện đủ 2 dòng để khớp menu thật.
 *
 * 5 resource orphan (có quyền ở backend nhưng CHƯA có trang/menu nào trỏ
 * tới — xem khảo sát 2026-09-10) gom vào nhóm "Khác (chưa có trên menu)" ở
 * cuối, để không mất khả năng cấp quyền cho chúng dù chưa có UI riêng.
 */

export interface PermissionFeatureItem {
  /** Đúng resource key ở `PermissionResources.ALL` phía backend. */
  resource: string;
  label: string;
  /** Ghi chú khi resource này cũng điều khiển 1 mục menu khác — hiện dưới checkbox. */
  sharedWith?: string;
}

export interface PermissionFeatureGroup {
  label: string;
  items: PermissionFeatureItem[];
  /** Chỉ "Danh mục" mới có — trải chi tiết từng nhóm danh mục con bên trong. */
  subGroups?: PermissionFeatureGroup[];
}

export const PERMISSION_FEATURE_GROUPS: PermissionFeatureGroup[] = [
  {
    label: "Nhập liệu Khai thác",
    items: [{ resource: "excavation-reports", label: "Nhập liệu Khai thác" }],
  },
  {
    label: "Nhập liệu Vận tải",
    items: [{ resource: "transport-reports", label: "Nhập liệu Vận tải" }],
  },
  {
    label: "Danh mục",
    items: [],
    subGroups: [
      {
        label: "Vật liệu, hàng hoá",
        items: [
          { resource: "cargo-types", label: "Chủng loại hàng" },
          { resource: "cargo-groups", label: "Nhóm chủng loại hàng" },
          { resource: "acceptance-products", label: "Sản phẩm nghiệm thu" },
        ],
      },
      {
        label: "Vị trí",
        items: [
          { resource: "receiving-points", label: "Nơi nhận tải" },
          { resource: "unloading-points", label: "Nơi dỡ tải" },
          { resource: "pickup-points", label: "Nơi chất tải" },
          { resource: "excavation-areas", label: "Khu vực xúc" },
        ],
      },
      {
        label: "Thiết bị",
        items: [
          { resource: "devices", label: "Thông tin xe" },
          { resource: "devices", label: "Thông tin máy" },
          { resource: "vehicle-types", label: "Chủng loại xe" },
          { resource: "vehicle-rank-groups", label: "Nhóm hạng xe" },
          { resource: "vehicle-ranks", label: "Hạng xe" },
        ],
      },
      {
        label: "Số trắc địa (STD)",
        items: [
          { resource: "survey-standards", label: "STD (Đất CN)" },
          { resource: "survey-standards", label: "STD (Đất SX/Than SX)" },
        ],
      },
      {
        label: "Danh mục khác",
        items: [
          { resource: "ttl-clh-items", label: "TTL CLH" },
          { resource: "seam-groups", label: "Nhóm vỉa" },
          { resource: "vehicle-fuel-classes", label: "Chủng loại xe + DMNL" },
          { resource: "coefficients", label: "Hệ số" },
          { resource: "report-periods", label: "Kỳ báo cáo" },
          { resource: "model-periods", label: "Mô hình" },
          { resource: "matrix-catalogs", label: "Năng suất xe (996)", sharedWith: "Định mức nhiên liệu" },
          { resource: "matrix-catalogs", label: "HS điều chỉnh NLĐM", sharedWith: "Định mức nhiên liệu" },
          { resource: "density-parameters", label: "Tỷ trọng" },
          { resource: "device-production-attributes", label: "Thuộc tính sản lượng — Xe" },
          { resource: "device-production-attributes", label: "Thuộc tính sản lượng — Máy xúc" },
          { resource: "shifts", label: "Ca làm việc" },
        ],
      },
      {
        label: "Danh mục Hệ thống",
        items: [
          { resource: "departments", label: "Phòng ban" },
          { resource: "positions", label: "Chức vụ" },
          { resource: "users", label: "Tài khoản" },
        ],
      },
      {
        label: "Khác (chưa có trên menu)",
        items: [
          { resource: "locations", label: "Vị trí (dùng nội bộ cho nhập liệu)" },
          { resource: "materials", label: "Vật tư (dùng nội bộ cho nhập liệu)" },
          { resource: "device-types", label: "Loại thiết bị" },
          { resource: "classifications", label: "Phân loại" },
          { resource: "vehicle-category-classes", label: "Chủng loại xe + Phân loại" },
        ],
      },
    ],
  },
  {
    label: "Định mức nhiên liệu",
    items: [
      {
        resource: "matrix-catalogs",
        label: "Định mức nhiên liệu",
        sharedWith: "Năng suất xe (996), HS điều chỉnh NLĐM (trong Danh mục)",
      },
    ],
  },
  {
    label: "Áp Trắc Địa",
    items: [{ resource: "production", label: "Áp Trắc Địa", sharedWith: "Báo cáo thống kê" }],
  },
  {
    label: "Đối chiếu",
    items: [{ resource: "reconciliation", label: "Đối chiếu" }],
  },
  {
    label: "Báo chuyến",
    items: [{ resource: "reconciliation", label: "Báo chuyến", sharedWith: "Đối chiếu" }],
  },
  {
    label: "Báo cáo thống kê",
    items: [
      { resource: "production", label: "Tính sản lượng, xuất báo cáo", sharedWith: "Áp Trắc Địa" },
      { resource: "report-periods", label: "Chốt / mở khoá kỳ báo cáo", sharedWith: "Kỳ báo cáo (trong Danh mục)" },
    ],
  },
];

/** Toàn bộ dòng (resource, label) phẳng — dùng khi cần lặp không quan tâm nhóm. */
export function flattenPermissionFeatures(): PermissionFeatureItem[] {
  const result: PermissionFeatureItem[] = [];
  const walk = (groups: PermissionFeatureGroup[]) => {
    for (const group of groups) {
      result.push(...group.items);
      if (group.subGroups) walk(group.subGroups);
    }
  };
  walk(PERMISSION_FEATURE_GROUPS);
  return result;
}

/** Nhãn tiếng Việt đầu tiên tìm được cho 1 resource — dùng khi cần hiện 1 tên duy nhất (vd bảng ma trận quyền). */
export function labelForResource(resource: string): string {
  const found = flattenPermissionFeatures().find((f) => f.resource === resource);
  return found?.label ?? resource;
}
