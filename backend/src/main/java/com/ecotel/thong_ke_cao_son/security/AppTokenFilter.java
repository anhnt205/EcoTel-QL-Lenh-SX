package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.permission.PermissionDto;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.auth.mode:standalone}")
    private String authMode = "standalone";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Spring đã verify và set Jwt object vào context
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            // Refresh token dùng được như access token (Quality Gate lượt 7
            // của Codex, 2026-09-16) — LocalAuthService phát hành 2 loại
            // token với claim "permissions"/"departmentId"/"fullDataScope"
            // GIỐNG HỆT NHAU, chỉ khác "typ" (access/refresh) và TTL. Trước
            // đây filter này dựng AppUserDetails từ BẤT KỲ JWT hợp lệ nào có
            // claim "permissions" — gửi thẳng refresh token (sống tới 7
            // ngày) làm "Authorization: Bearer" vẫn gọi được API nghiệp vụ
            // suốt TTL đó, bỏ qua hẳn ý nghĩa "access token hết hạn sau vài
            // giờ". Sửa: ở chế độ standalone (nơi LocalAuthService LUÔN ghi
            // claim "typ"), CHỈ chấp nhận typ="access" — token thiếu claim
            // hoặc typ khác đều KHÔNG được dựng thành AppUserDetails, để
            // nguyên principal ở dạng Jwt "thô" (không có quyền) khiến
            // PermissionFilter tự từ chối 401 (không phải AppUserDetails,
            // xem PermissionFilter dòng kiểm tra "auth.getPrincipal()
            // instanceof AppUserDetails"). CỐ Ý bỏ qua kiểm tra này ở chế độ
            // portal — CHƯA XÁC MINH Portal có phát hành claim "typ" với
            // đúng ngữ nghĩa này hay không (token Portal có thể hoàn toàn
            // không có claim "typ"), ép sai có nguy cơ khoá nhầm toàn bộ chế
            // độ portal.
            if ("standalone".equalsIgnoreCase(authMode) && !"access".equals(jwt.getClaim("typ"))) {
                chain.doFilter(request, response);
                return;
            }

            Map<String, Object> rawPerms = jwt.getClaim("permissions");
            if (rawPerms != null) {
                // Parse permissions và replace principal bằng AppUserDetails
                Map<String, PermissionDto> permissions = parsePermissions(rawPerms);

                Object departmentIdClaim = jwt.getClaim("departmentId");
                Long departmentId = departmentIdClaim instanceof Number n ? n.longValue() : null;

                // FAIL-CLOSED bắt buộc (Quality Gate lượt 3 của Codex,
                // 2026-09-10 — sửa lại quyết định SAI ở lượt trước): claim
                // "fullDataScope" VẮNG MẶT — dù vì token Portal cũ/tương lai
                // chưa biết claim này, token bị chỉnh sửa, hay bất kỳ lý do
                // nào khác — KHÔNG được coi là "thấy toàn bộ". Lượt trước cố
                // ý mặc định true để "không khoá nhầm token Portal" nhưng đó
                // chính là fail-OPEN: bất kỳ token nào thiếu đúng 1 claim
                // (kể cả token cố tình bị cắt bớt) sẽ bỏ qua HOÀN TOÀN việc
                // lọc dữ liệu theo đơn vị — vô hiệu hoá cả tính năng. Mặc
                // định false: token thiếu claim bị coi như "đã scoped
                // nhưng chưa gán đơn vị" (departmentId cũng sẽ null trong
                // trường hợp này) — tức KHÔNG xem được dữ liệu đã gắn đơn vị
                // nào cả (đúng ngữ nghĩa "chưa biết phạm vi thì không được
                // xem", không phải "chưa biết phạm vi thì xem hết"). Khi
                // Portal thật sự phát hành token có 2 claim này, hành vi lại
                // đúng như local token. LocalAuthService (đường auth THẬT
                // đang chạy — chế độ standalone) LUÔN ghi đủ 2 claim.
                Object fullDataScopeClaim = jwt.getClaim("fullDataScope");
                Boolean fullDataScope = Boolean.TRUE.equals(fullDataScopeClaim);

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
