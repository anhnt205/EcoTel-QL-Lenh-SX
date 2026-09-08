package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.enums.Role;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * {@code LocalAuthService} — hai việc thêm sau Quality Gate của Codex
 * (2026-09-07):
 *
 * <ol>
 *   <li>{@code refresh()} phải từ chối tài khoản đã bị khoá SAU khi có
 *       refresh token — trước đó không kiểm tra, nên khoá tài khoản không
 *       thật sự chặn được người đang giữ refresh token còn hạn (tới 7
 *       ngày, tự gia hạn mỗi lần gọi). Codex nêu đích danh, yêu cầu thêm
 *       test.</li>
 *   <li>{@code permissionsFor()} — bộ quyền theo vai trò mà
 *       {@code PermissionFilter} giờ THẬT SỰ dùng để gate (trước đó không
 *       controller nào gắn {@code @RequirePermission} nên bộ quyền này
 *       chưa từng được thực thi — xem {@code PermissionFilter} mục 3 và
 *       phát hiện BLOCKING của Quality Gate). Test bằng cách đăng nhập rồi
 *       giải mã claim {@code permissions} trong token thật, KHÔNG gọi
 *       thẳng hàm {@code private} — để test còn đúng nếu sau này đổi cách
 *       tính quyền nhưng vẫn phải đi qua token.</li>
 * </ol>
 *
 * <p>Chạy THUẦN Mockito, không {@code @SpringBootTest} — cùng lý do với
 * {@code ProductionKeysTest} (project rule mục 3: {@code contextLoads}
 * vốn đã fail khi không có Postgres/Redis sống). Các trường {@code @Value}
 * (không có trong constructor do Lombok {@code @RequiredArgsConstructor}
 * chỉ sinh từ field {@code final}) được bơm bằng {@link ReflectionTestUtils}.
 */
@ExtendWith(MockitoExtension.class)
class LocalAuthServiceTest {

    private static final String SECRET = "unit-test-only-secret-32-bytes-min!!";

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private LocalAuthService newService() {
        LocalAuthService service = new LocalAuthService(userRepository, passwordEncoder);
        ReflectionTestUtils.setField(service, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(service, "accessTtlSeconds", 28800L);
        ReflectionTestUtils.setField(service, "refreshTtlSeconds", 604800L);
        ReflectionTestUtils.setField(service, "appCode", "tkcs");
        return service;
    }

    private static User activeUser(String username, Role role) {
        User u = new User();
        u.setId(1L);
        u.setUsername(username);
        u.setFullName("Người dùng test");
        u.setPassword("hashed");
        u.setActive(true);
        u.setRole(role);
        return u;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> decodedClaims(String token) {
        Map<String, Object> claims = LocalAuthService.LocalJwt.verifyAndReadClaims(token, SECRET);
        assertThat(claims).as("chữ ký hợp lệ, token chưa hết hạn").isNotNull();
        return claims;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Boolean> permissionsOf(Map<String, Object> claims, String resource) {
        Map<String, Object> permissions = (Map<String, Object>) claims.get("permissions");
        return (Map<String, Boolean>) permissions.get(resource);
    }

    @Nested
    @DisplayName("login() — chặn tài khoản bị khoá")
    class Login {

        @Test
        @DisplayName("active=false -> UNAUTHORIZED, KHÔNG kiểm tra mật khẩu")
        void rejectsInactiveAccountBeforeCheckingPassword() {
            User locked = activeUser("kt01", Role.EMPLOYEE);
            locked.setActive(false);
            when(userRepository.findByUsername("kt01")).thenReturn(Optional.of(locked));

            assertThatThrownBy(() -> newService().login("kt01", "bất kỳ mật khẩu nào"))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("đã bị khoá");
        }
    }

    @Nested
    @DisplayName("refresh() — chặn tài khoản bị khoá SAU khi đã có refresh token")
    class Refresh {

        @Test
        @DisplayName("tài khoản đang active lúc login, bị khoá trước khi refresh -> UNAUTHORIZED")
        void rejectsRefreshOnceAccountBecomesInactive() {
            User user = activeUser("kt01", Role.EMPLOYEE);
            when(userRepository.findByUsername("kt01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("dungmk", "hashed")).thenReturn(true);

            LocalAuthService service = newService();
            LocalAuthService.TokenPair pair = service.login("kt01", "dungmk");

            // Tài khoản bị khoá SAU khi đã phát hành refresh token — đây
            // chính là kịch bản Codex nêu: token cũ vẫn còn hạn 7 ngày.
            user.setActive(false);

            assertThatThrownBy(() -> service.refresh(pair.refreshToken()))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("đã bị khoá");
        }

        @Test
        @DisplayName("tài khoản vẫn active -> refresh thành công, cấp cặp token mới")
        void allowsRefreshWhileStillActive() {
            User user = activeUser("kt01", Role.EMPLOYEE);
            when(userRepository.findByUsername("kt01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("dungmk", "hashed")).thenReturn(true);

            LocalAuthService service = newService();
            LocalAuthService.TokenPair original = service.login("kt01", "dungmk");

            LocalAuthService.TokenPair renewed = service.refresh(original.refreshToken());

            assertThat(renewed.appToken()).isNotBlank();
            assertThat(renewed.refreshToken()).isNotBlank();
        }

        @Test
        @DisplayName("token không phải loại refresh (đưa nhầm access token) -> UNAUTHORIZED")
        void rejectsAccessTokenPassedAsRefreshToken() {
            User user = activeUser("kt01", Role.EMPLOYEE);
            when(userRepository.findByUsername("kt01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("dungmk", "hashed")).thenReturn(true);

            LocalAuthService service = newService();
            LocalAuthService.TokenPair pair = service.login("kt01", "dungmk");

            assertThatThrownBy(() -> service.refresh(pair.appToken()))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("không hợp lệ");
        }
    }

    @Nested
    @DisplayName("Bộ quyền theo vai trò trong token — cái PermissionFilter thật sự dùng để gate")
    class PermissionsByRole {

        @Test
        @DisplayName("EMPLOYEE: chỉ đọc (r) trên mọi resource, không tạo/sửa/xoá/duyệt")
        void employeeIsReadOnly() {
            User user = activeUser("nv01", Role.EMPLOYEE);
            when(userRepository.findByUsername("nv01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);

            LocalAuthService.TokenPair pair = newService().login("nv01", "x");
            Map<String, Boolean> production = permissionsOf(decodedClaims(pair.appToken()), "production");

            assertThat(production.get("r")).isTrue();
            assertThat(production.get("c")).isFalse();
            assertThat(production.get("u")).isFalse();
            assertThat(production.get("d")).isFalse();
            assertThat(production.get("a")).isFalse();
        }

        @Test
        @DisplayName("MANAGER: đọc + tạo/sửa (vd gọi được /api/production/calculate), không xoá/duyệt")
        void managerCanWriteButNotDeleteOrApprove() {
            User user = activeUser("ql01", Role.MANAGER);
            when(userRepository.findByUsername("ql01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);

            LocalAuthService.TokenPair pair = newService().login("ql01", "x");
            Map<String, Boolean> production = permissionsOf(decodedClaims(pair.appToken()), "production");

            assertThat(production.get("r")).isTrue();
            assertThat(production.get("c")).isTrue();
            assertThat(production.get("u")).isTrue();
            assertThat(production.get("d")).isFalse();
            assertThat(production.get("a")).isFalse();
        }

        @Test
        @DisplayName("ADMIN: đủ cả năm quyền, kể cả xoá và mở khoá kỳ đã chốt (action \"a\")")
        void adminHasEveryPermission() {
            User user = activeUser("admin", Role.ADMIN);
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);

            LocalAuthService.TokenPair pair = newService().login("admin", "x");
            Map<String, Boolean> reportPeriods = permissionsOf(decodedClaims(pair.appToken()), "report-periods");

            assertThat(reportPeriods.values()).allMatch(Boolean::booleanValue);
        }

        @Test
        @DisplayName("role null (dữ liệu cũ chưa có role) -> coi như EMPLOYEE, không mặc định mở quyền")
        void nullRoleDefaultsToReadOnlyNotOpen() {
            User user = activeUser("legacy", null);
            when(userRepository.findByUsername("legacy")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);

            LocalAuthService.TokenPair pair = newService().login("legacy", "x");
            Map<String, Boolean> production = permissionsOf(decodedClaims(pair.appToken()), "production");

            assertThat(production.get("r")).isTrue();
            assertThat(production.get("c")).isFalse();
            assertThat(production.get("d")).isFalse();
        }
    }
}
