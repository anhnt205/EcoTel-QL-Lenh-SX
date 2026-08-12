package com.ecotel.thong_ke_cao_son.permission;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AuthenticatedUser {
    private Long   userId;
    private String username;
    private String fullName;
    private Long   companyId;
    private Long   departmentId;
    private Long   positionId;
    private String appCode;

    // Map<moduleCode, PermissionDto>
    // Ví dụ: "nhan-su/nhan-vien" → {c:false, r:true, u:false, d:false, a:false}
    private Map<String, PermissionDto> permissions;

    public boolean canRead(String moduleCode) {
        PermissionDto p = permissions.get(moduleCode);
        return p != null && p.isR();
    }

    public boolean canCreate(String moduleCode) {
        PermissionDto p = permissions.get(moduleCode);
        return p != null && p.isC();
    }

    public boolean canUpdate(String moduleCode) {
        PermissionDto p = permissions.get(moduleCode);
        return p != null && p.isU();
    }

    public boolean canDelete(String moduleCode) {
        PermissionDto p = permissions.get(moduleCode);
        return p != null && p.isD();
    }

    public boolean canApprove(String moduleCode) {
        PermissionDto p = permissions.get(moduleCode);
        return p != null && p.isA();
    }
}
