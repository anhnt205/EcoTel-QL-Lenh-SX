package com.ecotel.thong_ke_cao_son.websocket;

import com.ecotel.thong_ke_cao_son.event.ReconciliationChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

/**
 * Gửi tín hiệu WebSocket thật sự — CHỈ SAU KHI transaction đã COMMIT xong
 * ({@code AFTER_COMMIT}), không phải ngay lúc {@link ReconciliationChangedEvent}
 * được publish (thường vẫn còn đang giữa 1 transaction đang mở).
 *
 * <p>Đây là điểm bắt buộc phải đúng, không phải chi tiết vặt: nếu gửi tín hiệu
 * ngay trong lúc transaction chưa commit, client nhận tín hiệu "có đổi" rồi gọi
 * lại API tìm kiếm CÓ THỂ chạy trước khi dữ liệu mới thật sự nằm trong CSDL —
 * đọc lại đúng số liệu CŨ, coi như tín hiệu vô nghĩa (và tệ hơn, tạo cảm giác
 * "lúc được lúc không" rất khó tái hiện khi gỡ lỗi sau này).
 *
 * <p>{@code fallbackExecution = true} để vẫn gửi được nếu vì lý do nào đó sự
 * kiện được publish ngoài transaction (không nên xảy ra với các nơi đang gọi,
 * nhưng phòng hờ im lặng mất tín hiệu còn tệ hơn gửi hơi sớm một lần hiếm gặp).
 */
@Component
@RequiredArgsConstructor
public class ReconciliationWebSocketNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onReconciliationChanged(ReconciliationChangedEvent event) {
        // Payload chỉ mang mốc thời gian — không mang dữ liệu nghiệp vụ gì.
        // Client dùng tín hiệu này để tự gọi lại API, không đọc trực tiếp từ
        // đây.
        messagingTemplate.convertAndSend("/topic/reconciliation", Instant.now().toEpochMilli());
    }
}
