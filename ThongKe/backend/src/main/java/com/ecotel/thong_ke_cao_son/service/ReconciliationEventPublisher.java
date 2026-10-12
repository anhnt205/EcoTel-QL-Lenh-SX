package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.event.ReconciliationApprovedEvent;
import com.ecotel.thong_ke_cao_son.event.ReconciliationChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Set;

/**
 * Cổng DUY NHẤT để báo "dữ liệu ảnh hưởng tới Đối chiếu vừa đổi" — tiêm vào
 * {@link TransportReportService}, {@link ExcavationReportService},
 * {@link ReconciliationService} thay vì mỗi nơi tự gọi thẳng
 * {@code SimpMessagingTemplate}, để đổi cơ chế thông báo sau này (nếu có) chỉ
 * sửa đúng 1 chỗ.
 *
 * <p>Publish qua {@link ApplicationEventPublisher} (sự kiện Spring nội bộ,
 * không phải gửi WebSocket ngay) để việc gửi thật sự có thể đợi tới khi
 * transaction COMMIT xong — xem {@code ReconciliationWebSocketNotifier}. Gửi
 * ngay trong lúc transaction đang chạy sẽ có khả năng client vừa nhận tín hiệu
 * "có đổi" đã gọi lại API TRƯỚC KHI dữ liệu thật sự nằm trong CSDL, đọc lại số
 * cũ, y hệt lỗi vẫn đang cố sửa.
 */
@Component
@RequiredArgsConstructor
public class ReconciliationEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public void publishChanged() {
        applicationEventPublisher.publishEvent(new ReconciliationChangedEvent(this));
    }

    /**
     * Báo "vừa duyệt xong ít nhất 1 chuyến của (các) ngày này" — kích hoạt tự
     * động tính lại báo cáo sản lượng của (các) kỳ chứa những ngày đó, xem
     * {@code ProductionAutoRecalculateListener}. Không gọi khi
     * {@code reportDates} rỗng (không có gì mới được DUYỆT trong lần gọi này).
     */
    public void publishApproved(Set<LocalDate> reportDates) {
        if (reportDates == null || reportDates.isEmpty()) return;
        applicationEventPublisher.publishEvent(new ReconciliationApprovedEvent(this, reportDates));
    }
}
