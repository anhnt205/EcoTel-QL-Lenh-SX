package com.ecotel.thong_ke_cao_son.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

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
        Jwt.Builder builder = Jwt.withTokenValue("token-value")
                .header("alg", "none")
                .subject("1")
                .claim("username", "nv01")
                .claim("fullName", "Nhân viên test")
                .claim("permissions", Map.of("transport-reports", Map.of("r", true)))
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
}
