package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.model.User;
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
    private final PasswordEncoder passwordEncoder;

    @Value("${app.auth.jwt-secret}")
    private String jwtSecret;

    @Value("${app.auth.access-token-ttl-seconds:28800}")
    private long accessTtlSeconds;

    @Value("${app.auth.refresh-token-ttl-seconds:604800}")
    private long refreshTtlSeconds;

    @Value("${app.code:tkcs}")
    private String appCode;

    /** Các resource mà ứng dụng đang có. Dùng để dựng claim permissions. */
    private static final List<String> RESOURCES = List.of(
            "users", "departments", "positions", "shifts", "locations",
            "devices", "device-types", "materials", "cargo-groups", "cargo-types",
            "excavation-reports", "transport-reports", "reconciliation"
    );

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
     * Quy đổi {@code Role} sang bộ quyền theo resource.
     *
     * <p>Lưu ý: hiện KHÔNG controller nào gắn {@code @RequirePermission} nên
     * {@code PermissionFilter} cho qua hết; bộ quyền này mới chỉ để token có
     * đủ hình dạng và để sẵn sàng cho lúc bắt đầu gate thật.
     */
    private Map<String, Map<String, Boolean>> permissionsFor(User user) {
        String role = user.getRole() != null ? user.getRole().name() : "EMPLOYEE";
        boolean all = "ADMIN".equals(role);
        boolean write = all || "MANAGER".equals(role);

        Map<String, Map<String, Boolean>> perms = new LinkedHashMap<>();
        for (String resource : RESOURCES) {
            perms.put(resource, Map.of(
                    "c", write,
                    "r", true,
                    "u", write,
                    "d", all,
                    "a", all
            ));
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
