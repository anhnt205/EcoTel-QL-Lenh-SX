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
