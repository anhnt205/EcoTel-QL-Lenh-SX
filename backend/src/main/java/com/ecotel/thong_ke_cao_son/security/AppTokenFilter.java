package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.permission.PermissionDto;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class AppTokenFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Spring đã verify và set Jwt object vào context
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Map<String, Object> rawPerms = jwt.getClaim("permissions");
            if (rawPerms != null) {
                // Parse permissions và replace principal bằng AppUserDetails
                Map<String, PermissionDto> permissions = parsePermissions(rawPerms);

                Object departmentIdClaim = jwt.getClaim("departmentId");
                Long departmentId = departmentIdClaim instanceof Number n ? n.longValue() : null;

                // Claim "fullDataScope" VẮNG MẶT (khác với có mặt và = false) nghĩa
                // là token không phải do LocalAuthService phát hành (LocalAuthService
                // LUÔN ghi claim này, kể cả false) — ví dụ token Portal cũ/tương lai
                // chưa biết tới tính năng lọc theo đơn vị này. Coi như fullDataScope
                // để KHÔNG khoá nhầm một luồng đăng nhập khác chưa được cập nhật,
                // thay vì âm thầm khoá hết dữ liệu của mọi tài khoản Portal.
                Object fullDataScopeClaim = jwt.getClaim("fullDataScope");
                Boolean fullDataScope = fullDataScopeClaim != null
                        ? Boolean.TRUE.equals(fullDataScopeClaim)
                        : Boolean.TRUE;

                AppUserDetails principal = new AppUserDetails(
                        jwt.getSubject(),
                        jwt.getClaim("username"),
                        jwt.getClaim("fullName"),
                        jwt.getClaim("companyId"),
                        jwt.getClaim("app"),
                        permissions,
                        departmentId,
                        fullDataScope
                );
                UsernamePasswordAuthenticationToken newAuth =
                        new UsernamePasswordAuthenticationToken(
                                principal, null, principal.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(newAuth);
            }
        }

        chain.doFilter(request, response);
    }

    private Map<String, PermissionDto> parsePermissions(Map<String, Object> rawPerms) {
        Map<String, PermissionDto> permissions = new HashMap<>();
        rawPerms.forEach((resource, val) -> {
            Map<String, Object> permMap = (Map<String, Object>) val;
            PermissionDto dto = PermissionDto.builder()
                    .c(Boolean.TRUE.equals(permMap.get("c")))
                    .r(Boolean.TRUE.equals(permMap.get("r")))
                    .u(Boolean.TRUE.equals(permMap.get("u")))
                    .d(Boolean.TRUE.equals(permMap.get("d")))
                    .a(Boolean.TRUE.equals(permMap.get("a")))
                    .build();
            permissions.put(resource, dto);
        });
        return permissions;
    }
}
