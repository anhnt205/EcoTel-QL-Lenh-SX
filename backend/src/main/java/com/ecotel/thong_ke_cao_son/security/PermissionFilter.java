package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.annotation.PublicApi;
import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.io.IOException;

@Component
public class PermissionFilter extends OncePerRequestFilter {

    private final RequestMappingHandlerMapping handlerMapping;

    public PermissionFilter(@Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        try {
            HandlerExecutionChain handlerChain = handlerMapping.getHandler(request);
            if (handlerChain == null || !(handlerChain.getHandler() instanceof HandlerMethod method)) {
                chain.doFilter(request, response);
                return;
            }

            // 1. Kiểm tra @PublicApi (method trước, class sau)
            if (method.hasMethodAnnotation(PublicApi.class) ||
                    method.getBeanType().isAnnotationPresent(PublicApi.class)) {
                chain.doFilter(request, response);
                return;
            }

            // 2. Xác định resource: ưu tiên method → class
            RequirePermission methodAnnotation = method.getMethodAnnotation(RequirePermission.class);
            RequirePermission classAnnotation  = method.getBeanType().getAnnotation(RequirePermission.class);

            String resource = null;
            String action   = null;

            if (methodAnnotation != null && !methodAnnotation.action().isEmpty()) {
                // Trường hợp endpoint đặc biệt: /approve, /export...
                resource = methodAnnotation.resource();
                action   = methodAnnotation.action();
            } else if (classAnnotation != null) {
                // Trường hợp CRUD thông thường: lấy resource từ class, action từ HTTP method
                resource = classAnnotation.resource();
                action   = resolveActionFromMethod(request.getMethod());
            }

            // 3. Không có annotation nào → bỏ qua (endpoint chưa được config)
            if (resource == null || action == null) {
                chain.doFilter(request, response);
                return;
            }

            // 4. Kiểm tra user và permission
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (!(auth != null && auth.getPrincipal() instanceof AppUserDetails user)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            if (!user.hasPermission(resource, action)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                        "Không có quyền: " + resource + ":" + action);
                return;
            }

            chain.doFilter(request, response);

        } catch (Exception e) {
            // handlerMapping.getHandler() có thể throw nếu không match route
            chain.doFilter(request, response);
        }
    }

    private String resolveActionFromMethod(String httpMethod) {
        return switch (httpMethod) {
            case "GET"           -> "r";
            case "POST"          -> "c";
            case "PUT", "PATCH"  -> "u";
            case "DELETE"        -> "d";
            default              -> null;
        };
    }
}
