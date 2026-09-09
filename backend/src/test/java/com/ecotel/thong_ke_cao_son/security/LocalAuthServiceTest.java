package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.repository.PositionPermissionRepository;
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

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * {@code LocalAuthService} — ba việc:
 *
 * <ol>
 *   <li>{@code refresh()} phải từ chối tài khoản đã bị khoá SAU khi có
 *       refresh token — trước đó không kiểm tra, nên khoá tài khoản không
 *       thật sự chặn được người đang giữ refresh token còn hạn (tới 7
 *       ngày, tự gia hạn mỗi lần gọi). Codex nêu đích danh, yêu cầu thêm
 *       test (2026-09-07).</li>
 *   <li>{@code permissionsFor()} — bộ quyền mà {@code PermissionFilter}
 *       thật sự dùng để gate. Test bằng cách đăng nhập rồi giải mã claim
 *       {@code permissions} trong token thật, KHÔNG gọi thẳng hàm
 *       {@code private} — để test còn đúng nếu sau này đổi cách tính quyền
 *       nhưng vẫn phải đi qua token.</li>
 *   <li><b>2026-09-10:</b> {@code permissionsFor()} đổi hẳn từ {@code Role}
 *       tĩnh (EMPLOYEE/MANAGER/ADMIN hard-code) sang tính TỪ CHỨC VỤ (bảng
 *       {@code position_permissions}, data-driven) — test cũ theo Role đã
 *       lỗi thời, viết lại toàn bộ nhóm {@code PermissionsByPosition}.</li>
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
    @Mock private PositionPermissionRepository positionPermissionRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private LocalAuthService newService() {
        LocalAuthService service = new LocalAuthService(userRepository, positionPermissionRepository, passwordEncoder);
        ReflectionTestUtils.setField(service, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(service, "accessTtlSeconds", 28800L);
        ReflectionTestUtils.setField(service, "refreshTtlSeconds", 604800L);
        ReflectionTestUtils.setField(service, "appCode", "tkcs");
        return service;
    }

    private static User activeUser(String username, Position position) {
        User u = new User();
        u.setId(1L);
        u.setUsername(username);
        u.setFullName("Người dùng test");
        u.setPassword("hashed");
        u.setActive(true);
        u.setPosition(position);
        return u;
    }

    private static Position position(long id) {
        Position p = new Position();
        p.setId(id);
        p.setCode("VT_TP");
        p.setName("Trưởng phòng Vận tải");
        return p;
    }

    private static PositionPermission permission(Position position, String resource,
                                                   boolean c, boolean r, boolean u, boolean d, boolean a) {
        PositionPermission perm = new PositionPermission();
        perm.setPosition(position);
        perm.setResource(resource);
        perm.setCanCreate(c);
        perm.setCanRead(r);
        perm.setCanUpdate(u);
        perm.setCanDelete(d);
        perm.setCanApprove(a);
        return perm;
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
            User locked = activeUser("kt01", null);
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
            User user = activeUser("kt01", null);
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
            User user = activeUser("kt01", null);
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
            User user = activeUser("kt01", null);
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
    @DisplayName("Bộ quyền theo Chức vụ trong token — cái PermissionFilter thật sự dùng để gate (2026-09-10)")
    class PermissionsByPosition {

        @Test
        @DisplayName("Chưa gán Chức vụ -> chỉ đọc (r) trên MỌI resource, không tạo/sửa/xoá/duyệt")
        void noPositionIsReadOnlyEverywhere() {
            User user = activeUser("nv01", null);
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
        @DisplayName("Có Chức vụ nhưng resource KHÔNG có dòng quyền nào -> không có quyền gì, kể cả đọc")
        void positionWithoutRowForResourceGrantsNothing() {
            Position pos = position(10L);
            User user = activeUser("ql01", pos);
            when(userRepository.findByUsername("ql01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);
            // Chức vụ CÓ quyền trên "reconciliation" nhưng không hề nhắc tới
            // "production" — khác hẳn hành vi Role cũ (mở toang mọi resource
            // theo 1 mức duy nhất), giờ phải khai RÕ TỪNG resource.
            when(positionPermissionRepository.findByPosition_Id(10L))
                    .thenReturn(List.of(permission(pos, "reconciliation", true, true, true, false, true)));

            LocalAuthService.TokenPair pair = newService().login("ql01", "x");
            Map<String, Boolean> production = permissionsOf(decodedClaims(pair.appToken()), "production");

            assertThat(production.values()).allMatch(v -> !v);
        }

        @Test
        @DisplayName("Có dòng quyền cho resource -> đúng y hệt cờ C/R/U/D/A đã set ở Chức vụ")
        void positionPermissionFlagsPassThroughExactly() {
            Position pos = position(11L);
            User user = activeUser("ttp01", pos);
            when(userRepository.findByUsername("ttp01")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);
            when(positionPermissionRepository.findByPosition_Id(11L))
                    .thenReturn(List.of(permission(pos, "report-periods", true, true, true, false, false)));

            LocalAuthService.TokenPair pair = newService().login("ttp01", "x");
            Map<String, Boolean> reportPeriods = permissionsOf(decodedClaims(pair.appToken()), "report-periods");

            assertThat(reportPeriods.get("c")).isTrue();
            assertThat(reportPeriods.get("r")).isTrue();
            assertThat(reportPeriods.get("u")).isTrue();
            assertThat(reportPeriods.get("d")).isFalse();
            assertThat(reportPeriods.get("a")).isFalse();
        }

        @Test
        @DisplayName("Chức vụ đủ quyền trên mọi resource (vd Quản trị hệ thống) -> đủ cả năm quyền")
        void positionWithFullGrantOnEveryResourceHasEveryPermission() {
            Position pos = position(1L);
            User user = activeUser("admin", pos);
            when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("x", "hashed")).thenReturn(true);
            List<PositionPermission> allGranted = PermissionResources.ALL.stream()
                    .map(resource -> permission(pos, resource, true, true, true, true, true))
                    .toList();
            when(positionPermissionRepository.findByPosition_Id(1L)).thenReturn(allGranted);

            LocalAuthService.TokenPair pair = newService().login("admin", "x");
            Map<String, Boolean> reportPeriods = permissionsOf(decodedClaims(pair.appToken()), "report-periods");

            assertThat(reportPeriods.values()).allMatch(Boolean::booleanValue);
        }
    }
}
