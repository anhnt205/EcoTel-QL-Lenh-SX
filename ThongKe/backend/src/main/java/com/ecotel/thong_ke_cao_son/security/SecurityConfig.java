package com.ecotel.thong_ke_cao_son.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final String[] PUBLIC_ENDPOINT = {
            "/actuator/health",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            // AuthController.exchangeCode()/refresh() phải public ở tầng Spring Security
            // (không chỉ @PublicApi, vốn chỉ được PermissionFilter đọc SAU khi request
            // đã qua được .anyRequest().authenticated() bên dưới) — nếu không, không ai
            // đăng nhập lần đầu được vì lúc đó chưa hề có JWT để xác thực.
            "/api/auth/**",
            // Request bắt tay WebSocket ban đầu (GET nâng cấp giao thức) do
            // trình duyệt tự gửi qua `new WebSocket(url)` — API này KHÔNG cho
            // gắn header Authorization (giới hạn của trình duyệt). Xác thực
            // JWT thật sự dời sang lúc client gửi frame STOMP CONNECT, xem
            // WebSocketConfig — request bắt tay này KHÔNG mang dữ liệu nghiệp
            // vụ nào, chỉ mở kết nối.
            "/api/ws/**"
    };


    private final AppTokenFilter appTokenFilter;
    private final PermissionFilter permissionFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .authorizeHttpRequests(authorize -> authorize
                                .requestMatchers(PUBLIC_ENDPOINT).permitAll()
                                .anyRequest().authenticated()
                )
                .addFilterAfter(appTokenFilter, BearerTokenAuthenticationFilter.class)  // ← sau khi Spring verify xong
                .addFilterAfter(permissionFilter, AppTokenFilter.class)
                .httpBasic(AbstractHttpConfigurer::disable) // Tat Login Swagger
                .formLogin(AbstractHttpConfigurer::disable)
                .build();
    }

    /**
     * Bộ giải mã JWT — chọn theo {@code app.auth.mode}:
     *
     * <ul>
     *   <li>{@code standalone} (mặc định): token do CHÍNH ứng dụng này cấp ở
     *       {@code /api/auth/login}, ký đối xứng HS256 bằng
     *       {@code app.auth.jwt-secret}. Không cần Portal.</li>
     *   <li>{@code portal}: giữ nguyên hành vi cũ — verify RS256 qua JWKS của
     *       Portal ({@code spring.security.oauth2.resourceserver.jwt.jwk-set-uri}).</li>
     * </ul>
     *
     * <p>Khi ghép trở lại Portal chỉ cần đổi {@code app.auth.mode=portal},
     * không phải sửa code. Đường đăng nhập qua Portal
     * ({@code /api/auth/exchange-code}) vẫn giữ nguyên, không xoá.
     */
    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${app.auth.mode:standalone}") String mode,
            @Value("${app.auth.jwt-secret:}") String jwtSecret,
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:}") String jwkSetUri) {

        if ("portal".equalsIgnoreCase(mode)) {
            if (jwkSetUri.isBlank()) {
                throw new IllegalStateException(
                        "app.auth.mode=portal nhưng thiếu jwk-set-uri của Portal");
            }
            return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        }

        if (jwtSecret.isBlank()) {
            throw new IllegalStateException(
                    "app.auth.mode=standalone nhưng thiếu app.auth.jwt-secret");
        }
        // HS256 yêu cầu khoá tối thiểu 256 bit — chặn ngay lúc khởi động thay
        // vì để lỗi mơ hồ lúc có request đầu tiên.
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "app.auth.jwt-secret phải dài ít nhất 32 ký tự (256 bit) cho HS256");
        }
        SecretKey key = new SecretKeySpec(
                jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();

        corsConfiguration.addAllowedOriginPattern("*");
        corsConfiguration.addAllowedMethod("*");
        corsConfiguration.addAllowedHeader("*");
        corsConfiguration.addExposedHeader("*");
        corsConfiguration.setAllowCredentials(false); // phải false khi dùng wildcard origin
        corsConfiguration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);

        return source;
    }
}
