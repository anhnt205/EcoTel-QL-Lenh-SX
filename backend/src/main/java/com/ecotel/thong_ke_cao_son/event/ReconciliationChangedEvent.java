package com.ecotel.thong_ke_cao_son.event;

import org.springframework.context.ApplicationEvent;

/**
 * "Có gì đó vừa đổi, làm ảnh hưởng tới màn Đối chiếu" — chuyến Vận tải/Khai
 * thác được thêm/sửa/xoá, hoặc Thống kê vừa duyệt/yêu cầu sửa/gửi lại.
 *
 * <p>Chỉ là tín hiệu "có đổi", KHÔNG mang theo dữ liệu cụ thể gì đã đổi — client
 * nhận tín hiệu này (qua WebSocket, xem {@code ReconciliationWebSocketNotifier})
 * rồi tự gọi lại đúng API tìm kiếm để lấy dữ liệu MỚI NHẤT. Tránh nhân đôi logic
 * tính trạng thái/màu dòng (đã có sẵn, đã test kỹ ở
 * {@code ReconciliationService#search}) sang một đường dẫn dữ liệu thứ hai qua
 * socket — một nguồn sự thật duy nhất.
 */
public class ReconciliationChangedEvent extends ApplicationEvent {
    public ReconciliationChangedEvent(Object source) {
        super(source);
    }
}
