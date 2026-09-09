package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.repository.PositionPermissionRepository;
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
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", String.valueOf(user.getId()));
        claims.put("username", user.getUsername());
        claims.put("fullName", user.getFullName());
        claims.put("companyId", null);
        claims.put("app", appCode);
        claims.put("typ", type);
        claims.put("permissions", permissionsFor(user));
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", now.plusSeconds(ttlSeconds).getEpochSecond());
        return LocalJwt.sign(claims, jwtSecret);
    }

    /**
     * Dựng bộ quyền theo resource TỪ CHỨC VỤ của user (data-driven, thay hẳn
     * {@code Role} tĩnh cũ — chủ dự án chốt 2026-09-10: mọi tài khoản mới tạo
     * chỉ chọn Chức vụ, không chọn Role; tài khoản {@code admin}/{@code xemthu}
     * seed sẵn được gán Chức vụ "Quản trị hệ thống" có đủ quyền trên mọi
     * resource — xem {@code seed-danh-muc-he-thong.sql} — để không bị khoá
     * ngay khi đổi cơ chế này.
     *
     * <p>Từ 2026-09-07: {@code PermissionFilter} thật sự gate theo bộ quyền
     * này — mọi controller nghiệp vụ đã gắn {@code @RequirePermission}, và
     * endpoint thiếu annotation bị từ chối mặc định (fail-closed) thay vì
     * cho qua.
     *
     * <p>User CHƯA được gán Chức vụ (Phòng Nhân sự chưa kịp cấu hình) chỉ
     * được xem (r), không thao tác gì — an toàn hơn hẳn "chặn đăng nhập" mà
     * không lộ ra lỗi khó hiểu cho người mới tạo tài khoản.
     */
    private Map<String, Map<String, Boolean>> permissionsFor(User user) {
        Position position = user.getPosition();
        Map<String, PositionPermission> byResource = position == null
                ? Map.of()
                : positionPermissionRepository.findByPosition_Id(position.getId()).stream()
                        .collect(Collectors.toMap(PositionPermission::getResource, p -> p));

        Map<String, Map<String, Boolean>> perms = new LinkedHashMap<>();
        for (String resource : PermissionResources.ALL) {
            PositionPermission p = byResource.get(resource);
            perms.put(resource, p == null
                    ? Map.of("c", false, "r", position == null, "u", false, "d", false, "a", false)
                    : Map.of(
                            "c", p.isCanCreate(),
                            "r", p.isCanRead(),
                            "u", p.isCanUpdate(),
                            "d", p.isCanDelete(),
                            "a", p.isCanApprove()));
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
