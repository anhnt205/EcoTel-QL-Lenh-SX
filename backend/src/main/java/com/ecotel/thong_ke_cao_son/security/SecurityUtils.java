package com.ecotel.thong_ke_cao_son.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Đọc {@link AppUserDetails} của người dùng đang đăng nhập từ tầng Service —
 * dùng cho việc lọc/xác minh dữ liệu theo đơn vị (xem
 * {@code TransportReportService}/{@code ExcavationReportService}/
 * {@code ReconciliationService}), tránh phải sửa chữ ký MỌI method controller
 * chỉ để truyền {@code @AuthenticationPrincipal} xuống. Cùng cách
 * {@code PermissionFilter} đã đọc {@code SecurityContextHolder} trực tiếp.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /** null nếu không có principal hợp lệ (không nên xảy ra sau PermissionFilter — fail-closed ở nơi gọi). */
    public static AppUserDetails currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserDetails details) {
            return details;
        }
        return null;
    }
}
