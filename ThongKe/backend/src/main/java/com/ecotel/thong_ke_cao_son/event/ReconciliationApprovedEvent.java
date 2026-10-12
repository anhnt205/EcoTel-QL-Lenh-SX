package com.ecotel.thong_ke_cao_son.event;

import org.springframework.context.ApplicationEvent;

import java.time.LocalDate;
import java.util.Set;

/**
 * "Đối chiếu vừa DUYỆT ít nhất 1 chuyến" — tách riêng khỏi
 * {@link ReconciliationChangedEvent} (vốn cũng bắn từ {@code updateTrips}/
 * {@code resubmitTrips}, không liên quan tới duyệt) vì đây là tín hiệu để tự
 * động tính lại báo cáo sản lượng (chủ dự án chốt 2026-09-10: duyệt đối
 * chiếu xong thì báo cáo thống kê phải tự tính luôn, không cần đợi người
 * dùng bấm "Tính lại kỳ").
 *
 * <p>Mang theo ngày báo cáo (không phải periodId thẳng) vì nơi publish
 * ({@code ReconciliationService}) không cần biết khái niệm "kỳ" — tra kỳ từ
 * ngày là việc của listener xử lý sự kiện này
 * ({@code ProductionAutoRecalculateListener}, dùng
 * {@code ReportPeriodRepository.findByDate}).
 */
public class ReconciliationApprovedEvent extends ApplicationEvent {

    private final Set<LocalDate> reportDates;

    public ReconciliationApprovedEvent(Object source, Set<LocalDate> reportDates) {
        super(source);
        this.reportDates = reportDates;
    }

    public Set<LocalDate> getReportDates() {
        return reportDates;
    }
}
