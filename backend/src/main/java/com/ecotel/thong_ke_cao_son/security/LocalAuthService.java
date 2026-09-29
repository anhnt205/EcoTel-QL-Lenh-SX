package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.model.UserPermission;
import com.ecotel.thong_ke_cao_son.repository.PositionPermissionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserPermissionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Đăng nhập CỤC BỘ — chế độ chạy độc lập, không cần Portal.
 *
 * <p>Token sinh ra cố ý dùng ĐÚNG bộ claim mà {@link AppTokenFilter} đang đọc
 * cho token của Portal ({@code sub}, {@code username}, {@code fullName},
 * {@code companyId}, {@code app}, {@code permissions}). Nhờ vậy toàn bộ tầng
 * phân quyền phía sau không phải sửa gì, và khi ghép lại vào Portal chỉ cần
 * đổi {@code app.auth.mode} về {@code portal}.
 *
 * <p>Khác biệt duy nhất: token cục bộ ký đối xứng HS256 bằng
 * {@code app.auth.jwt-secret}, còn token Portal ký RS256 và verify qua JWKS.
 */
@Service
@RequiredArgsConstructor
public class LocalAuthService {

    private final UserRepository userRepository;
    private final PositionPermissionRepository positionPermissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.auth.jwt-secret}")
    private String jwtSecret;

    @Value("${app.auth.access-token-ttl-seconds:28800}")
    private long accessTtlSeconds;

    @Value("${app.auth.refresh-token-ttl-seconds:604800}")
    private long refreshTtlSeconds;

    @Value("${app.code:tkcs}")
    private String appCode;

    public record TokenPair(String appToken, String refreshToken) {}

    public TokenPair login(String username, String rawPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Sai tên đăng nhập hoặc mật khẩu"));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khoá");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            // Cố ý trả về CÙNG một thông báo với trường hợp sai username —
            // không để lộ username nào có thật.
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Sai tên đăng nhập hoặc mật khẩu");
        }

        Instant now = Instant.now();
        return new TokenPair(
                buildToken(user, now, accessTtlSeconds, "access"),
                buildToken(user, now, refreshTtlSeconds, "refresh")
        );
    }

    /** Đổi refresh token cục bộ lấy cặp token mới. */
    public TokenPair refresh(String refreshToken) {
        Map<String, Object> claims = LocalJwt.verifyAndReadClaims(refreshToken, jwtSecret);
        if (claims == null || !"refresh".equals(claims.get("typ"))) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ hoặc đã hết hạn");
        }
        String username = String.valueOf(claims.get("username"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Tài khoản không còn tồn tại"));

        // Thiếu ở bản gốc: tài khoản bị khoá SAU khi đã có refresh token vẫn
        // đổi được token mới vô thời hạn (refresh token sống tới 7 ngày, tự
        // gia hạn mỗi lần gọi) — khoá tài khoản không thật sự chặn được người
        // đó. Kiểm tra lại y hệt login(). Phát hiện qua Quality Gate của
        // Codex (2026-09-07).
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khoá");
        }

        Instant now = Instant.now();
        return new TokenPair(
                buildToken(user, now, accessTtlSeconds, "access"),
                buildToken(user, now, refreshTtlSeconds, "refresh")
        );
    }

    // ── Dựng JWT ────────────────────────────────────────────────────────────

    private String buildToken(User user, Instant now, long ttlSeconds, String type) {
        Department department = user.getDepartment();

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", String.valueOf(user.getId()));
        claims.put("username", user.getUsername());
        claims.put("fullName", user.getFullName());
        claims.put("companyId", null);
        claims.put("app", appCode);
        claims.put("typ", type);
        claims.put("permissions", permissionsFor(user));
        // Phân quyền DỮ LIỆU theo đơn vị (khác "permissions" ở trên — phân
        // quyền CHỨC NĂNG) — xem javadoc Department.fullDataScope và
        // AppUserDetails.canAccessDepartment. LUÔN ghi cả hai claim (kể cả
        // giá trị "trống"/false) để AppTokenFilter phân biệt được token cục
        // bộ này với token Portal chưa biết tới tính năng này.
        claims.put("departmentId", department != null ? department.getId() : null);
        claims.put("fullDataScope", department != null && Boolean.TRUE.equals(department.getFullDataScope()));
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", now.plusSeconds(ttlSeconds).getEpochSecond());
        return LocalJwt.sign(claims, jwtSecret);
    }

    /**
     * Dựng bộ quyền theo resource — data-driven, thay hẳn {@code Role} tĩnh cũ.
     * Từ 2026-09-10 (lượt 2, chủ dự án chốt): quyền có 3 tầng ưu tiên, dừng ở
     * tầng đầu tiên có dữ liệu:
     * <ol>
     *   <li><b>Quyền RIÊNG của tài khoản</b> ({@link UserPermission}) — khi màn
     *       Tài khoản đã lưu ít nhất 1 dòng cho user này (nghĩa là đã từng set
     *       qua form, dù đang giữ y hệt mẫu Chức vụ hay đã chỉnh tay). Cho phép
     *       2 tài khoản CÙNG Chức vụ có CRUD khác nhau — đúng yêu cầu gốc.</li>
     *   <li><b>Dự phòng: quyền của Chức vụ</b> ({@link PositionPermission}) —
     *       khi tài khoản CHƯA từng được set quyền riêng (tài khoản cũ tạo
     *       trước tính năng này, hoặc tạo mới nhưng người tạo không đụng gì
     *       vào bảng phân quyền). Tự "thừa kế" Chức vụ, không cần chạy migrate
     *       dữ liệu cũ.</li>
     *   <li><b>Chưa có Chức vụ</b> — chỉ đọc (r) mọi resource, không thao tác
     *       gì. An toàn hơn hẳn "chặn đăng nhập" mà không lộ lỗi khó hiểu cho
     *       người mới tạo tài khoản.</li>
     * </ol>
     *
     * <p>Từ 2026-09-07: {@code PermissionFilter} thật sự gate theo bộ quyền
     * này — mọi controller nghiệp vụ đã gắn {@code @RequirePermission}, và
     * endpoint thiếu annotation bị từ chối mặc định (fail-closed) thay vì
     * cho qua.
     */
    private Map<String, Map<String, Boolean>> permissionsFor(User user) {
        List<UserPermission> userRows = userPermissionRepository.findByUser_Id(user.getId());
        if (!userRows.isEmpty()) {
            return toPermissionMap(userRows.stream()
                    .collect(Collectors.toMap(UserPermission::getResource, p -> p)),
                    UserPermission::isCanCreate, UserPermission::isCanRead,
                    UserPermission::isCanUpdate, UserPermission::isCanDelete, UserPermission::isCanApprove,
                    false);
        }

        Position position = user.getPosition();
        Map<String, PositionPermission> byResource = position == null
                ? Map.of()
                : positionPermissionRepository.findByPosition_Id(position.getId()).stream()
                        .collect(Collectors.toMap(PositionPermission::getResource, p -> p));
        return toPermissionMap(byResource,
                PositionPermission::isCanCreate, PositionPermission::isCanRead,
                PositionPermission::isCanUpdate, PositionPermission::isCanDelete, PositionPermission::isCanApprove,
                position == null);
    }

    private <T> Map<String, Map<String, Boolean>> toPermissionMap(
            Map<String, T> byResource,
            java.util.function.Predicate<T> canCreate, java.util.function.Predicate<T> canRead,
            java.util.function.Predicate<T> canUpdate, java.util.function.Predicate<T> canDelete,
            java.util.function.Predicate<T> canApprove,
            boolean readOnlyDefault) {
        Map<String, Map<String, Boolean>> perms = new LinkedHashMap<>();
        for (String resource : PermissionResources.ALL) {
            T row = byResource.get(resource);
            perms.put(resource, row == null
                    ? Map.of("c", false, "r", readOnlyDefault, "u", false, "d", false, "a", false)
                    : Map.of(
                            "c", canCreate.test(row),
                            "r", canRead.test(row),
                            "u", canUpdate.test(row),
                            "d", canDelete.test(row),
                            "a", canApprove.test(row)));
        }
        return perms;
    }

    // ── Ký/verify HS256 tối giản (không kéo thêm thư viện) ──────────────────

    static final class LocalJwt {
        private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
        private static final Base64.Decoder DEC = Base64.getUrlDecoder();

        static String sign(Map<String, Object> claims, String secret) {
            String header = ENC.encodeToString(
                    "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            String payload = ENC.encodeToString(toJson(claims).getBytes(StandardCharsets.UTF_8));
            String signingInput = header + "." + payload;
            return signingInput + "." + ENC.encodeToString(hmac(signingInput, secret));
        }

        static Map<String, Object> verifyAndReadClaims(String token, String secret) {
            try {
                String[] parts = token.split("\\.");
                if (parts.length != 3) return null;
                byte[] expected = hmac(parts[0] + "." + parts[1], secret);
                if (!java.security.MessageDigest.isEqual(expected, DEC.decode(parts[2]))) return null;

                String json = new String(DEC.decode(parts[1]), StandardCharsets.UTF_8);
                Map<String, Object> claims = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(json, new com.fasterxml.jackson.core.type.TypeReference<>() {});
                Object exp = claims.get("exp");
                if (exp instanceof Number n && n.longValue() < Instant.now().getEpochSecond()) {
                    return null;
                }
                return claims;
            } catch (Exception e) {
                return null;
            }
        }

        private static byte[] hmac(String data, String secret) {
            try {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                throw new IllegalStateException("Không ký được JWT cục bộ", e);
            }
        }

        private static String toJson(Map<String, Object> claims) {
            try {
                return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(claims);
            } catch (Exception e) {
                throw new IllegalStateException("Không tuần tự hoá được claims", e);
            }
        }
    }
}
