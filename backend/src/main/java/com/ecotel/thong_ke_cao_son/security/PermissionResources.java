package com.ecotel.thong_ke_cao_son.security;

import java.util.List;

/**
 * Danh sách CHUẨN mọi "chức năng" (resource) mà ứng dụng có — tách ra từ
 * {@code LocalAuthService} 2026-09-10 khi thêm phân quyền theo Chức vụ (lưu
 * DB), vì giờ có 3 nơi cùng cần đúng 1 danh sách này thay vì chỉ 1:
 * <ul>
 *   <li>{@code LocalAuthService.permissionsFor} — dựng claim {@code permissions}
 *       của JWT từ bảng {@code position_permissions}.</li>
 *   <li>{@code DepartmentService} — trả danh sách để dựng checkbox "chức năng
 *       phòng ban được phép dùng" ở màn Danh mục Hệ thống.</li>
 *   <li>{@code PositionService} — validate mỗi quyền gửi lên nằm trong danh
 *       sách này VÀ nằm trong tập phòng ban đã tick (không cho set quyền cho
 *       resource không tồn tại hoặc phòng ban chưa được phép).</li>
 * </ul>
 *
 * <p>PHẢI khớp đúng {@code resource} khai ở {@code @RequirePermission} trên
 * từng controller — thiếu tên nào ở đây thì {@code AppUserDetails#hasPermission}
 * luôn trả {@code false} cho resource đó bất kể Chức vụ có quyền gì.
 */
public final class PermissionResources {

    private PermissionResources() {}

    public static final List<String> ALL = List.of(
            "users", "departments", "positions", "shifts", "locations",
            "devices", "device-types", "materials", "cargo-groups", "cargo-types",
            "excavation-reports", "transport-reports", "reconciliation",
            "acceptance-products", "classifications", "coefficients",
            "density-parameters", "device-production-attributes", "excavation-areas",
            "matrix-catalogs", "model-periods", "pickup-points", "production",
            "receiving-points", "report-periods", "seam-groups", "survey-standards",
            "ttl-clh-items", "unloading-points", "vehicle-category-classes",
            "vehicle-fuel-classes", "vehicle-rank-groups", "vehicle-ranks",
            "vehicle-types"
    );
}
