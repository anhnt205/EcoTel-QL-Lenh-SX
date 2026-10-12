package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.enums.PermissionAction;
import com.ecotel.thong_ke_cao_son.permission.PermissionDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUserDetails implements UserDetails {
    private String userId;
    private String username;
    private String fullName;
    private Long companyId;
    private String app;
    private Map<String, PermissionDto> permissions; // key: "nhan-su/nhan-vien"

    /** Đơn vị (Phòng ban) của tài khoản — null nếu chưa gán. Xem {@code Department.fullDataScope}. */
    private Long departmentId;
    /** true = bỏ qua lọc dữ liệu theo đơn vị (đơn vị kiểu Thống kê). */
    private Boolean fullDataScope;

    public boolean hasFullDataScope() {
        return Boolean.TRUE.equals(fullDataScope);
    }

    /**
     * Có được truy cập dữ liệu gắn với đơn vị {@code targetDepartmentId}
     * không.
     *
     * <p>Từ Quality Gate lượt 3 của Codex (2026-09-10) — sửa lại quyết định
     * SAI ở lượt trước: {@code targetDepartmentId == null} (thiết bị CHƯA
     * gán đơn vị) KHÔNG còn tự động cho phép. Lượt trước lý luận "không thể
     * lọc theo phạm vi không tồn tại" nhưng đó là lỗ hổng thật — CSDL brownfield
     * này phần lớn thiết bị/dữ liệu cũ chưa từng gán đơn vị, nên mọi tài
     * khoản scoped (không full-scope) vẫn đọc/sửa được HẦU HẾT dữ liệu hệ
     * thống qua đúng "khe hở" targetDepartmentId=null này — vô hiệu hoá gần
     * hết mục đích của tính năng phân quyền theo đơn vị. Giờ CHỈ tài khoản
     * full-scope (Thống kê/Admin) mới thấy được dữ liệu chưa gán đơn vị —
     * coi như "cách ly" (quarantine) cho tới khi đơn vị chủ quản thật của
     * thiết bị/dữ liệu đó được gán (việc backfill dữ liệu cũ là quyết định
     * nghiệp vụ của chủ dự án, ngoài phạm vi sửa code — không đoán bừa thiết
     * bị nào thuộc đơn vị nào).
     */
    public boolean canAccessDepartment(Long targetDepartmentId) {
        return hasFullDataScope()
                || (departmentId != null && departmentId.equals(targetDepartmentId));
    }

    public boolean hasPermission(String resource, String action) {
        PermissionDto perm = permissions.get(resource);
        if (perm == null) return false;
        return switch (action) {
            case "r" -> perm.isR();
            case "c" -> perm.isC();
            case "u" -> perm.isU();
            case "d" -> perm.isD();
            case "a" -> perm.isA();
            default  -> false;
        };
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Flatten permissions thành GrantedAuthority để tích hợp với Spring Security
        List<GrantedAuthority> authorities = new ArrayList<>();
        permissions.forEach((resource, perm) -> {
            for (PermissionAction action : PermissionAction.values()) {
                if (perm.has(action)) {
                    authorities.add(new SimpleGrantedAuthority(
                            "PERM_" + resource.toUpperCase().replace("/", "_") + "_" + action.name()
                    ));
                    // VD: PERM_NHAN_SU_NHAN_VIEN_R
                }
            }
        });
        return authorities;
    }

    @Override public String getPassword() { return null; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
