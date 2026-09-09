package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.event.ReconciliationApprovedEvent;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.model.ProductionResult;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Chủ dự án chốt 2026-09-10: Đối chiếu duyệt xong thì báo cáo thống kê sản
 * lượng phải TỰ tính luôn, không cần đợi người dùng bấm "Tính lại kỳ" (nút
 * đó vẫn giữ nguyên — dùng khi cần chủ động tính lại, ví dụ sau khi mở khoá
 * kỳ hoặc đổi chế độ TKE).
 *
 * <p>Chạy SAU KHI transaction duyệt đã COMMIT ({@code AFTER_COMMIT}, cùng
 * pattern {@code ReconciliationWebSocketNotifier}) — {@code calculatePeriod}
 * đọc lại trạng thái APPROVED của TOÀN BỘ chuyến trong kỳ, phải đọc được dữ
 * liệu vừa duyệt chứ không phải đọc dở giữa transaction.
 *
 * <p><b>"Chưa đủ điều kiện" KHÔNG phải lỗi:</b> {@code calculatePeriod} đòi
 * TOÀN BỘ chuyến của cả kỳ phải APPROVED (QĐ-16) — duyệt từng dòng lẻ tẻ
 * (không phải duyệt hàng loạt hết 1 kỳ) sẽ liên tục rơi vào trường hợp
 * "còn chuyến chưa duyệt", ném {@link BadRequestException}. Đây là trạng
 * thái BÌNH THƯỜNG (kỳ đang duyệt dở), không phải lỗi hệ thống — chỉ log mức
 * debug, KHÔNG log lỗi, KHÔNG có cách nào báo cho người dùng biết (đang chạy
 * nền sau khi response đã trả về) nên im lặng bỏ qua là đúng: người dùng
 * duyệt nốt các dòng còn lại, tự động tính lại sẽ thành công ở lần duyệt
 * cuối cùng của kỳ đó.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProductionAutoRecalculateListener {

    private final ReportPeriodRepository reportPeriodRepository;
    private final ProductionResultRepository productionResultRepository;
    private final ProductionCalculationService productionCalculationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onApproved(ReconciliationApprovedEvent event) {
        Set<Long> periodIds = new LinkedHashSet<>();
        for (LocalDate reportDate : event.getReportDates()) {
            reportPeriodRepository.findByDate(reportDate).ifPresent(p -> periodIds.add(p.getId()));
        }
        for (Long periodId : periodIds) {
            recalculateQuietly(periodId);
        }
    }

    private void recalculateQuietly(Long periodId) {
        ReportPeriod period = reportPeriodRepository.findById(periodId).orElse(null);
        if (period == null) {
            return;
        }
        if (period.isLocked()) {
            log.debug("Bỏ qua tự động tính lại kỳ {} (id={}) vì đã chốt — cần mở khoá rồi bấm Tính lại kỳ thủ công",
                    period.getDisplayName(), periodId);
            return;
        }

        // Kỳ chưa từng tính lần nào (chưa có dòng ProductionResult) thì chưa
        // biết chế độ TKE nào đang áp dụng — mặc định false, giống hành vi
        // form "Tính lại kỳ" ở frontend khi chưa ai chỉnh gì.
        boolean tkeMode = productionResultRepository.findFirstByReportPeriod_Id(periodId)
                .map(ProductionResult::isTkeMode)
                .orElse(false);

        try {
            productionCalculationService.calculatePeriod(periodId, tkeMode);
            log.info("Tự động tính lại sản lượng kỳ {} (id={}) sau khi Đối chiếu duyệt",
                    period.getDisplayName(), periodId);
        } catch (BadRequestException e) {
            log.debug("Kỳ {} (id={}) chưa đủ điều kiện để tự động tính lại: {}",
                    period.getDisplayName(), periodId, e.getMessage());
        } catch (Exception e) {
            // Transaction gốc (duyệt) đã COMMIT xong, không rollback được nữa —
            // chỉ log lỗi thật để biết mà xử lý tay, không được throw tiếp (sẽ
            // không ai bắt được, chỉ tạo stacktrace vô ích trong log listener).
            log.error("Lỗi không mong đợi khi tự động tính lại kỳ {} (id={})",
                    period.getDisplayName(), periodId, e);
        }
    }
}
