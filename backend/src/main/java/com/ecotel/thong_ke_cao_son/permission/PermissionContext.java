package com.ecotel.thong_ke_cao_son.permission;

import com.ecotel.thong_ke_cao_son.security.AppUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.nio.file.AccessDeniedException;

@Slf4j
@Component
public class PermissionContext {

    public AuthenticatedUser getCurrentUser(HttpServletRequest request) throws AccessDeniedException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !(auth.getPrincipal() instanceof AppUserDetails user)) {
            throw new AccessDeniedException("Chưa xác thực");
        }

        return AuthenticatedUser.builder()
                .userId(Long.parseLong(user.getUserId()))
                .username(user.getUsername())
                .fullName(user.getFullName())
                .appCode(user.getApp())
                .permissions(user.getPermissions())
                .build();
    }
}
