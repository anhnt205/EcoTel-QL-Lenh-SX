package com.ecotel.thong_ke_cao_son.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Kênh realtime cho màn Đối chiếu — chủ dự án chốt 2026-09-10: sửa dữ liệu ở
 * Vận tải/Khai thác phải tự cập nhật ngay ở Đối chiếu, không cần bấm tải lại
 * trang.
 *
 * <p><b>Mount ở {@code /api/ws}</b> — CỐ Ý trùng tiền tố với mọi API REST
 * khác, để đi qua ĐÚNG block {@code location /api/} đã có sẵn ở cả
 * {@code nginx_preview.conf} lẫn {@code nginx_staging.conf} (chỉ cần thêm 3
 * dòng {@code proxy_http_version}/{@code Upgrade}/{@code Connection} vào
 * block đó, không mở location mới) — deploy lên server thật không cần thêm
 * cấu hình gì ngoài 2 file đó.
 *
 * <p><b>Không dùng SockJS</b> — nội bộ dùng trình duyệt hiện đại, WebSocket
 * thuần là đủ; SockJS kéo theo endpoint phụ ({@code /info}, long-polling
 * fallback) phải whitelist riêng ở Spring Security, không cần thiết.
 *
 * <p><b>Vì sao tự xác thực JWT ở đây thay vì để Spring Security lo hết:</b>
 * request bắt tay WebSocket ban đầu (GET nâng cấp giao thức) do trình duyệt tự
 * gửi qua constructor {@code new WebSocket(url)} — API này KHÔNG cho gắn thêm
 * header {@code Authorization} (giới hạn của trình duyệt, không phải giới hạn
 * kỹ thuật ta chọn). Nên request bắt tay đó phải nằm trong allowlist public ở
 * {@code SecurityConfig} (xem {@code PUBLIC_ENDPOINT}), và việc xác thực JWT
 * thật sự dời sang lúc client gửi frame STOMP {@code CONNECT} — frame đó gửi
 * QUA kết nối WS đã mở, thư viện STOMP phía client gắn được header tuỳ ý
 * (không bị giới hạn của trình duyệt), nên vẫn gắn được
 * {@code Authorization: Bearer <token>}. Interceptor dưới đây đọc đúng header
 * đó, decode bằng {@link JwtDecoder} bean CÓ SẴN của {@code SecurityConfig}
 * (không tạo bộ giải mã JWT thứ hai) — sai/thiếu token thì ném lỗi ngay, Spring
 * tự đóng kết nối.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtDecoder jwtDecoder;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/api/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Chỉ cần broadcast 1 chiều server -> client, không cần client tự gửi
        // gì lên qua kênh này (mọi thao tác ghi vẫn đi qua API REST đã có sẵn,
        // giữ nguyên logic phân quyền/validate hiện tại) nên không cấu hình
        // application-destination-prefix.
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String header = accessor.getFirstNativeHeader("Authorization");
                    String token = header != null && header.startsWith("Bearer ")
                            ? header.substring(7) : header;
                    if (token == null || token.isBlank()) {
                        throw new IllegalArgumentException("Thiếu token xác thực cho kết nối realtime");
                    }
                    try {
                        Jwt jwt = jwtDecoder.decode(token);
                        accessor.setUser(jwt::getSubject);
                    } catch (JwtException e) {
                        throw new IllegalArgumentException("Token không hợp lệ cho kết nối realtime");
                    }
                }
                return message;
            }
        });
    }
}
