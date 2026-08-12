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
                AppUserDetails principal = new AppUserDetails(
                        jwt.getSubject(),
                        jwt.getClaim("username"),
                        jwt.getClaim("fullName"),
                        jwt.getClaim("companyId"),
                        jwt.getClaim("app"),
                        permissions
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
