package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.annotation.PublicApi;
import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
        // handlerMapping.getHandler() có thể throw nếu không match được route
        // (vd path lạ) — TÁCH riêng lời gọi này ra khỏi phần còn lại, KHÔNG
        // bọc chung try/catch với toàn bộ hàm như bản cũ. Bản cũ có 2 lỗi bảo
        // mật nghiêm trọng do 1 try/catch quá rộng gây ra (phát hiện qua
        // Quality Gate của Codex, 2026-09-10):
        //   1) Nếu getHandler() throw, catch cũ ÂM THẦM gọi chain.doFilter()
        //      — bỏ qua HẲN mọi kiểm tra quyền, cho request lọt qua tự do.
        //   2) Nếu chain.doFilter() (tức là CHẠY THẬT nghiệp vụ phía sau,
        //      nằm NGAY TRONG try) ném lỗi bất kỳ, catch cũ lại gọi
        //      chain.doFilter() THÊM MỘT LẦN NỮA để "cho qua" — nghiệp vụ
        //      chạy 2 LẦN, có thể ghi dữ liệu trùng lặp nếu lỗi xảy ra sau
        //      khi đã ghi được một phần.
        // Sửa: getHandler() lỗi thì NÉM LỖI THẲNG (từ chối, không bỏ qua);
        // chain.doFilter() nằm NGOÀI mọi try/catch của filter này — lỗi
        // nghiệp vụ phía sau tự trồi lên bình thường, không bị bắt lại và
        // gọi lần hai.
        final HandlerExecutionChain handlerChain;
        try {
            handlerChain = handlerMapping.getHandler(request);
        } catch (Exception e) {
            throw new ServletException("Không xác định được handler để kiểm tra quyền", e);
        }

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

        // 2. Xác định resource + action: ưu tiên method → class
        RequirePermission methodAnnotation = method.getMethodAnnotation(RequirePermission.class);
        RequirePermission classAnnotation  = method.getBeanType().getAnnotation(RequirePermission.class);
        RequirePermission permission = methodAnnotation != null ? methodAnnotation : classAnnotation;

        String action = null;
        if (methodAnnotation != null && !methodAnnotation.action().isEmpty()) {
            // Trường hợp endpoint đặc biệt: /decisions (duyệt đối chiếu, cần
            // đúng action "a" — KHÔNG được suy mặc định từ POST là "c", nếu
            // không ai có quyền "Thêm" cũng duyệt được, xem
            // ReconciliationController#saveDecision(s))...
            action = methodAnnotation.action();
        } else if (classAnnotation != null) {
            // Trường hợp CRUD thông thường: lấy resource từ class, action từ HTTP method
            action = resolveActionFromMethod(request.getMethod());
        }

        // 3. Không có annotation nào (hoặc action không suy ra được) → TỪ CHỐI
        // (fail-closed). Endpoint mới thêm sau này mà quên gắn annotation sẽ
        // bị chặn ngay thay vì âm thầm mở toang (Quality Gate của Codex,
        // 2026-09-07).
        if (permission == null || action == null) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN,
                    "Endpoint chưa khai @RequirePermission — mặc định từ chối.");
            return;
        }

        // 4. Kiểm tra user và permission
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth != null && auth.getPrincipal() instanceof AppUserDetails user)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        if (!user.hasPermission(permission.resource(), action)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN,
                    "Không có quyền: " + permission.resource() + ":" + action);
            return;
        }

        chain.doFilter(request, response);
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
