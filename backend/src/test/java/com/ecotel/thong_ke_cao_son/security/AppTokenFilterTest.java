package com.ecotel.thong_ke_cao_son.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * {@code AppTokenFilter} — parse claim {@code departmentId}/{@code fullDataScope}
 * từ JWT thành {@link AppUserDetails}. Quality Gate lượt 3 của Codex
 * (2026-09-11): trước đây token THIẾU claim {@code fullDataScope} (khác
 * "có claim, giá trị false") mặc định coi như {@code fullDataScope=true} —
 * fail-OPEN thật sự, vì bất kỳ token nào thiếu đúng 1 claim (token Portal
 * cũ, hay đơn giản là token bị cắt bớt) sẽ bỏ qua HOÀN TOÀN việc lọc dữ
 * liệu theo đơn vị. Đã sửa: thiếu claim -> {@code fullDataScope=false}
 * (fail-closed).
 */
class AppTokenFilterTest {

    private final AppTokenFilter filter = new AppTokenFilter();
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();
    private final FilterChain chain = mock(FilterChain.class);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static Jwt jwtWithClaims(Map<String, Object> extraClaims) {
        // "typ"="access" mặc định — các test cũ trong file này kiểm tra khác
        // (parse departmentId/fullDataScope), không phải kiểm tra chính "typ"
        // nên fixture phải là 1 access token HỢP LỆ để không bị chặn bởi
        // kiểm tra typ mới thêm (Quality Gate lượt 7). Test riêng cho "typ"
        // ở nested class AccessVsRefreshToken bên dưới tự override claim này.
        Jwt.Builder builder = Jwt.withTokenValue("token-value")
                .header("alg", "none")
                .subject("1")
                .claim("username", "nv01")
                .claim("fullName", "Nhân viên test")
                .claim("permissions", Map.of("transport-reports", Map.of("r", true)))
                .claim("typ", "access")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600));
        extraClaims.forEach(builder::claim);
        return builder.build();
    }

    private void authenticateWithJwt(Jwt jwt) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, java.util.List.of()));
    }

    private AppUserDetails runFilterAndGetPrincipal() throws Exception {
        filter.doFilterInternal(request, response, chain);
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        assertThat(principal).isInstanceOf(AppUserDetails.class);
        return (AppUserDetails) principal;
    }

    @Test
    @DisplayName("Token ĐẦY ĐỦ 2 claim (departmentId=7, fullDataScope=true) -> parse đúng, KHÔNG bị ghi đè")
    void fullyPopulatedTokenParsesExactly() throws Exception {
        authenticateWithJwt(jwtWithClaims(Map.of("departmentId", 7, "fullDataScope", true)));

        AppUserDetails principal = runFilterAndGetPrincipal();

        assertThat(principal.getDepartmentId()).isEqualTo(7L);
        assertThat(principal.hasFullDataScope()).isTrue();
    }

    @Test
    @DisplayName("Token CÓ claim fullDataScope=false, departmentId=7 -> parse đúng, KHÔNG bị mặc định true")
    void explicitFalseIsRespected() throws Exception {
        authenticateWithJwt(jwtWithClaims(Map.of("departmentId", 7, "fullDataScope", false)));

        AppUserDetails principal = runFilterAndGetPrincipal();

        assertThat(principal.getDepartmentId()).isEqualTo(7L);
        assertThat(principal.hasFullDataScope()).isFalse();
    }

    @Test
    @DisplayName("Token THIẾU HẲN claim fullDataScope VÀ departmentId (vd token Portal cũ) -> fail-CLOSED, KHÔNG fullDataScope=true (lỗi thật đã sửa)")
    void missingBothClaimsFailsClosed() throws Exception {
        authenticateWithJwt(jwtWithClaims(Map.of())); // không claim departmentId/fullDataScope nào cả

        AppUserDetails principal = runFilterAndGetPrincipal();

        assertThat(principal.hasFullDataScope())
                .as("Thiếu claim KHÔNG được mặc định true — đó chính là fail-open Codex nêu")
                .isFalse();
        assertThat(principal.getDepartmentId()).isNull();
        // Hệ quả thực tế: tài khoản này không truy cập được BẤT KỲ dữ liệu
        // đã gắn đơn vị nào (canAccessDepartment luôn false với departmentId=null).
        assertThat(principal.canAccessDepartment(99L)).isFalse();
    }

    @Test
    @DisplayName("Token thiếu RIÊNG claim fullDataScope (có departmentId) -> vẫn fail-closed fullDataScope=false")
    void missingOnlyFullDataScopeClaimFailsClosed() throws Exception {
        authenticateWithJwt(jwtWithClaims(Map.of("departmentId", 7)));

        AppUserDetails principal = runFilterAndGetPrincipal();

        assertThat(principal.getDepartmentId()).isEqualTo(7L);
        assertThat(principal.hasFullDataScope()).isFalse();
    }

    /**
     * Refresh token dùng được như access token (Quality Gate lượt 7 của
     * Codex, 2026-09-16): {@code LocalAuthService} phát hành access/refresh
     * token với claim {@code permissions}/{@code departmentId}/
     * {@code fullDataScope} GIỐNG HỆT NHAU, chỉ khác {@code typ} và TTL —
     * filter trước đây không hề đọc {@code typ}, nên gửi thẳng refresh
     * token (sống 7 ngày) làm Bearer vẫn gọi được API nghiệp vụ suốt TTL
     * đó. Chỉ áp dụng kiểm tra ở chế độ {@code standalone} — chế độ
     * {@code portal} CHƯA XÁC MINH claim {@code typ} có cùng ngữ nghĩa hay
     * không nên KHÔNG được ép, tránh khoá nhầm toàn bộ portal mode.
     */
    @Nested
    @DisplayName("typ=access bắt buộc cho request nghiệp vụ (Quality Gate lượt 7)")
    class AccessVsRefreshToken {

        private AppTokenFilter filterWithMode(String mode) {
            AppTokenFilter f = new AppTokenFilter();
            ReflectionTestUtils.setField(f, "authMode", mode);
            return f;
        }

        /** Principal KHÔNG bị thay bằng AppUserDetails — PermissionFilter sẽ tự 401 (xem PermissionFilterTest). */
        private void assertRejectedAsRawJwt(AppTokenFilter f, Jwt jwt) throws Exception {
            authenticateWithJwt(jwt);
            f.doFilterInternal(request, response, chain);
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            assertThat(principal).as("phải KHÔNG được dựng AppUserDetails từ token này")
                    .isNotInstanceOf(AppUserDetails.class);
        }

        @Test
        @DisplayName("standalone: access token -> API nghiệp vụ thành công (AppUserDetails được dựng)")
        void accessTokenInStandaloneModeIsAccepted() throws Exception {
            AppTokenFilter f = filterWithMode("standalone");
            authenticateWithJwt(jwtWithClaims(Map.of("typ", "access")));

            f.doFilterInternal(request, response, chain);

            assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                    .isInstanceOf(AppUserDetails.class);
        }

        @Test
        @DisplayName("standalone: refresh token gửi thẳng làm Bearer -> KHÔNG được dựng AppUserDetails (dẫn tới 401 ở PermissionFilter)")
        void refreshTokenInStandaloneModeIsRejected() throws Exception {
            assertRejectedAsRawJwt(filterWithMode("standalone"), jwtWithClaims(Map.of("typ", "refresh")));
        }

        @Test
        @DisplayName("standalone: token thiếu hẳn claim typ -> fail-closed, KHÔNG được dựng AppUserDetails")
        void missingTypInStandaloneModeIsRejected() throws Exception {
            Jwt jwtWithoutTyp = Jwt.withTokenValue("token-value")
                    .header("alg", "none")
                    .subject("1")
                    .claim("username", "nv01")
                    .claim("permissions", Map.of("transport-reports", Map.of("r", true)))
                    .issuedAt(Instant.now())
                    .expiresAt(Instant.now().plusSeconds(3600))
                    .build();
            assertRejectedAsRawJwt(filterWithMode("standalone"), jwtWithoutTyp);
        }

        @Test
        @DisplayName("portal: refresh token gửi làm Bearer -> KHÔNG bị chặn bởi kiểm tra typ (chưa xác minh Portal dùng cùng ngữ nghĩa claim này)")
        void refreshTokenInPortalModeIsUnaffected() throws Exception {
            AppTokenFilter f = filterWithMode("portal");
            authenticateWithJwt(jwtWithClaims(Map.of("typ", "refresh")));

            f.doFilterInternal(request, response, chain);

            assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                    .as("chế độ portal không được ép typ — tránh khoá nhầm token Portal thật")
                    .isInstanceOf(AppUserDetails.class);
        }

        @Test
        @DisplayName("portal: token không có claim typ (đúng hình dạng token Portal hiện nay) -> vẫn hoạt động như trước, không regression")
        void missingTypInPortalModeIsUnaffected() throws Exception {
            Jwt jwtWithoutTyp = Jwt.withTokenValue("token-value")
                    .header("alg", "none")
                    .subject("1")
                    .claim("username", "nv01")
                    .claim("permissions", Map.of("transport-reports", Map.of("r", true)))
                    .issuedAt(Instant.now())
                    .expiresAt(Instant.now().plusSeconds(3600))
                    .build();
            AppTokenFilter f = filterWithMode("portal");
            authenticateWithJwt(jwtWithoutTyp);

            f.doFilterInternal(request, response, chain);

            assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                    .isInstanceOf(AppUserDetails.class);
        }
    }
}
