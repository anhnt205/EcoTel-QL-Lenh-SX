package com.ecotel.thong_ke_cao_son.service.production;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.ecotel.thong_ke_cao_son.event.ReconciliationApprovedEvent;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.PeriodNotFullyApprovedException;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * {@code ProductionAutoRecalculateListener} — Quality Gate lượt 2 của Codex
 * (2026-09-10): trước đây MỌI {@link BadRequestException} ném từ
 * {@code calculatePeriod} bị bắt CHUNG một chỗ, log mức debug — kể cả lỗi
 * nghiệp vụ/dữ liệu THẬT (kỳ đã chốt, tra trượt định mức...), không riêng
 * "kỳ đang duyệt dở" (trường hợp duy nhất thật sự bình thường). Hậu quả: lần
 * duyệt cuối của một kỳ có thể thất bại thật (vd thiếu định mức) mà không ai
 * biết, không có cách retry.
 *
 * <p>Test bằng {@link ListAppender} bắt log thật của {@code Logger} lớp này,
 * xác nhận đúng MỨC log cho từng loại lỗi — không chỉ "không văng exception"
 * (điều đó đã đúng từ trước, không phải chỗ Codex nêu).
 */
@ExtendWith(MockitoExtension.class)
class ProductionAutoRecalculateListenerTest {

    @Mock private ReportPeriodRepository reportPeriodRepository;
    @Mock private ProductionResultRepository productionResultRepository;
    @Mock private ProductionCalculationService productionCalculationService;

    private ListAppender<ILoggingEvent> logAppender;

    @BeforeEach
    void attachLogAppender() {
        logAppender = new ListAppender<>();
        logAppender.start();
        // Root logger mặc định chỉ INFO trong môi trường test — DEBUG bị lọc
        // TRƯỚC KHI tới appender (Logback lọc theo effective level của
        // Logger, không phải ở Appender). Phải nâng level rõ ràng thì mới
        // bắt được đúng log.debug() cần xác minh.
        listenerLogger().setLevel(Level.DEBUG);
        listenerLogger().addAppender(logAppender);
    }

    @AfterEach
    void detachLogAppender() {
        listenerLogger().detachAppender(logAppender);
        listenerLogger().setLevel(null); // trả lại kế thừa từ root, tránh rò rỉ sang test khác
    }

    private static Logger listenerLogger() {
        return (Logger) LoggerFactory.getLogger(ProductionAutoRecalculateListener.class);
    }

    private ProductionAutoRecalculateListener newListener() {
        return new ProductionAutoRecalculateListener(
                reportPeriodRepository, productionResultRepository, productionCalculationService);
    }

    private static ReportPeriod openPeriod(long id) {
        ReportPeriod p = new ReportPeriod();
        p.setId(id);
        p.setLocked(false);
        p.setDisplayName("Kỳ test");
        return p;
    }

    @Test
    @DisplayName("PeriodNotFullyApprovedException (kỳ đang duyệt dở) -> chỉ log DEBUG, không log ERROR, KHÔNG đánh dấu stale")
    void incompleteApprovalIsLoggedAtDebugOnly() {
        LocalDate reportDate = LocalDate.of(2026, 9, 1);
        ReportPeriod period = openPeriod(1L);
        when(reportPeriodRepository.findByDate(reportDate)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(productionResultRepository.findFirstByReportPeriod_Id(1L)).thenReturn(Optional.empty());
        doThrow(new PeriodNotFullyApprovedException("còn chuyến chưa duyệt"))
                .when(productionCalculationService).calculatePeriod(1L, false);

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(reportDate)));

        assertThat(logAppender.list).noneMatch(e -> e.getLevel() == Level.ERROR);
        assertThat(logAppender.list).anyMatch(e -> e.getLevel() == Level.DEBUG);
        assertThat(period.isStale()).as("kỳ đang duyệt dở là BÌNH THƯỜNG, không phải lỗi cần đánh dấu").isFalse();
        verify(reportPeriodRepository, never()).save(any());
    }

    @Test
    @DisplayName("BadRequestException KHÁC (lỗi nghiệp vụ/dữ liệu thật, vd kỳ đã chốt) -> phải log ERROR VÀ đánh dấu kỳ stale (Quality Gate lượt 3 — eventual calculation)")
    void genuineBusinessErrorIsLoggedAtErrorAndMarksStale() {
        LocalDate reportDate = LocalDate.of(2026, 9, 1);
        ReportPeriod period = openPeriod(1L);
        when(reportPeriodRepository.findByDate(reportDate)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(productionResultRepository.findFirstByReportPeriod_Id(1L)).thenReturn(Optional.empty());
        doThrow(new BadRequestException("Kỳ đã chốt — mở khoá trước khi tính lại"))
                .when(productionCalculationService).calculatePeriod(1L, false);

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(reportDate)));

        assertThat(logAppender.list).anyMatch(e -> e.getLevel() == Level.ERROR
                && e.getFormattedMessage().contains("lỗi nghiệp vụ"));
        assertThat(period.isStale())
                .as("phải quan sát được qua ReportPeriod.stale (đã hiển thị sẵn ở frontend) -> người vận hành biết mà xử lý, không chỉ nằm trong log")
                .isTrue();
        verify(reportPeriodRepository).save(period);
    }

    @Test
    @DisplayName("Lỗi KHÔNG mong đợi (Exception bất kỳ) -> cũng đánh dấu stale, không chỉ log")
    void unexpectedErrorAlsoMarksStale() {
        LocalDate reportDate = LocalDate.of(2026, 9, 1);
        ReportPeriod period = openPeriod(1L);
        when(reportPeriodRepository.findByDate(reportDate)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(productionResultRepository.findFirstByReportPeriod_Id(1L)).thenReturn(Optional.empty());
        doThrow(new RuntimeException("lỗi lạ không xác định trước"))
                .when(productionCalculationService).calculatePeriod(1L, false);

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(reportDate)));

        assertThat(period.isStale()).isTrue();
        verify(reportPeriodRepository).save(period);
    }

    @Test
    @DisplayName("Kỳ ĐÃ stale từ trước -> không save lại lần nữa (tránh update thừa)")
    void alreadyStalePeriodIsNotSavedAgain() {
        LocalDate reportDate = LocalDate.of(2026, 9, 1);
        ReportPeriod period = openPeriod(1L);
        period.setStale(true);
        when(reportPeriodRepository.findByDate(reportDate)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(productionResultRepository.findFirstByReportPeriod_Id(1L)).thenReturn(Optional.empty());
        doThrow(new BadRequestException("lỗi thật"))
                .when(productionCalculationService).calculatePeriod(1L, false);

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(reportDate)));

        verify(reportPeriodRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tính thành công -> gọi calculatePeriod đúng 1 lần, log INFO, không lỗi")
    void successfulRecalculationLogsInfo() {
        LocalDate reportDate = LocalDate.of(2026, 9, 1);
        ReportPeriod period = openPeriod(1L);
        when(reportPeriodRepository.findByDate(reportDate)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(productionResultRepository.findFirstByReportPeriod_Id(1L)).thenReturn(Optional.empty());

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(reportDate)));

        verify(productionCalculationService, times(1)).calculatePeriod(1L, false);
        assertThat(logAppender.list).noneMatch(e -> e.getLevel() == Level.ERROR);
    }

    @Test
    @DisplayName("Kỳ đã CHỐT -> bỏ qua ngay, KHÔNG gọi calculatePeriod")
    void lockedPeriodSkipsRecalculationEntirely() {
        LocalDate reportDate = LocalDate.of(2026, 9, 1);
        ReportPeriod locked = openPeriod(1L);
        locked.setLocked(true);
        when(reportPeriodRepository.findByDate(reportDate)).thenReturn(Optional.of(locked));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(locked));

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(reportDate)));

        verifyNoInteractions(productionCalculationService);
    }

    @Test
    @DisplayName("Nhiều ngày CÙNG một kỳ -> chỉ tính lại kỳ đó đúng 1 lần (dedupe theo periodId)")
    void multipleDatesInSamePeriodRecalculateOnce() {
        ReportPeriod period = openPeriod(1L);
        LocalDate d1 = LocalDate.of(2026, 9, 1);
        LocalDate d2 = LocalDate.of(2026, 9, 2);
        when(reportPeriodRepository.findByDate(d1)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findByDate(d2)).thenReturn(Optional.of(period));
        when(reportPeriodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(productionResultRepository.findFirstByReportPeriod_Id(1L)).thenReturn(Optional.empty());

        newListener().onApproved(new ReconciliationApprovedEvent(this, Set.of(d1, d2)));

        verify(productionCalculationService, times(1)).calculatePeriod(1L, false);
    }
}
