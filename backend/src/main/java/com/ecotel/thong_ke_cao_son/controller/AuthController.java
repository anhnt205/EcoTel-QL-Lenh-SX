package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.PublicApi;
import com.ecotel.thong_ke_cao_son.security.LocalAuthService;
import com.ecotel.thong_ke_cao_son.security.OtcStore;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OtcStore otcStore;
    private final RestTemplate restTemplate;
    private final LocalAuthService localAuthService;

    @Value("${portal.internal-url}")     // ví dụ: http://portal-service:8080
    private String portalInternalUrl;

    @Value("${app.code}")                // "tkcs"
    private String appCode;

    /**
     * Đăng nhập CỤC BỘ — chế độ chạy độc lập, không cần Portal.
     * Chỉ có tác dụng khi {@code app.auth.mode=standalone} (mặc định), vì khi
     * đó bộ giải mã JWT mới là HS256 khớp với token do đây cấp.
     */
    @PublicApi
    @PostMapping("/login")
    public ResponseEntity<ExchangeCodeResponse> login(@RequestBody LoginRequest request) {
        LocalAuthService.TokenPair pair =
                localAuthService.login(request.username(), request.password());
        return ResponseEntity.ok(new ExchangeCodeResponse(pair.appToken(), pair.refreshToken()));
    }

    /** Đổi refresh token CỤC BỘ lấy cặp token mới (chế độ standalone). */
    @PublicApi
    @PostMapping("/refresh-local")
    public ResponseEntity<ExchangeCodeResponse> refreshLocal(@RequestBody RefreshRequest request) {
        LocalAuthService.TokenPair pair = localAuthService.refresh(request.refreshToken());
        return ResponseEntity.ok(new ExchangeCodeResponse(pair.appToken(), pair.refreshToken()));
    }

    public record LoginRequest(String username, String password) {}

    @PublicApi
    @PostMapping("/exchange-code")
    public ResponseEntity<ExchangeCodeResponse> exchangeCode(
            @RequestBody ExchangeCodeRequest request
    ) {
        OtcStore.OtcEntry entry = otcStore.consume(request.code())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired code"
                ));

        return ResponseEntity.ok(new ExchangeCodeResponse(
                entry.appToken(),
                entry.refreshToken()
        ));
    }

    @PublicApi
    @PostMapping("/refresh")
    public ResponseEntity<ExchangeCodeResponse> refresh(
            @RequestBody RefreshRequest request
    ) {
        PortalRefreshRequest portalReq = new PortalRefreshRequest(
                request.refreshToken(), appCode
        );

        try {
            PortalAppTokenResponse portalRes = restTemplate.postForObject(
                    portalInternalUrl + "/api/auth/refresh",
                    portalReq,
                    PortalAppTokenResponse.class
            );

            if (portalRes == null || portalRes.appToken() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY, "Empty response from portal"
                );
            }

            return ResponseEntity.ok(new ExchangeCodeResponse(
                    portalRes.appToken(),
                    portalRes.refreshToken()
            ));
        } catch (HttpStatusCodeException e) {
            // Portal trả 401 (refresh token hết hạn/bị revoke) → truyền nguyên trạng thái đó về client
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Refresh token invalid or expired"
            );
        } catch (RestClientException e) {
            // Lỗi kết nối tới portal (network, timeout...)
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Cannot reach portal service"
            );
        }
    }

    public record ExchangeCodeRequest(String code) {}
    public record ExchangeCodeResponse(String appToken, String refreshToken) {}
    public record RefreshRequest(String refreshToken) {}
    public record PortalRefreshRequest(String refreshToken, String appCode) {}
    public record PortalAppTokenResponse(String appToken, String refreshToken, Long expiresIn) {}
}