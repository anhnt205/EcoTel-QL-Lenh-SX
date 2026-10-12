package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.event.ReconciliationApprovedEvent;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.PeriodNotFullyApprovedException;
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
 * "còn chuyến chưa duyệt", ném {@link PeriodNotFullyApprovedException}. Đây
 * là trạng thái BÌNH THƯỜNG (kỳ đang duyệt dở), không phải lỗi hệ thống —
 * chỉ log mức debug, KHÔNG có cách nào báo cho người dùng biết (đang chạy
 * nền sau khi response đã trả về) nên im lặng bỏ qua là đúng: người dùng
 * duyệt nốt các dòng còn lại, tự động tính lại sẽ thành công ở lần duyệt
 * cuối cùng của kỳ đó.
 *
 * <p><b>Mọi {@link BadRequestException} KHÁC (kỳ đã chốt, chưa có chuyến,
 * hở tháng, tra trượt tham số định mức bắt buộc) là lỗi THẬT</b> — trước
 * 2026-09-10 (lượt 2) bị bắt CHUNG một chỗ với "chưa đủ điều kiện" nên cũng
 * bị nuốt y hệt, im lặng: lần duyệt cuối của kỳ có thể không tạo được báo
 * cáo (ví dụ thiếu định mức) mà không ai biết, không có cách retry. Từ nay
 * log mức lỗi để còn biết mà xử lý tay — xem {@link #recalculateQuietly}.
 * Phát hiện qua Quality Gate của Codex.
 *
 * <p><b>Phục hồi (lượt 3, 2026-09-10 — Codex yêu cầu "eventual calculation"
 * chứ không chỉ log rồi bỏ):</b> khi tự động tính lại thất bại vì lỗi THẬT
 * (không phải "chưa đủ điều kiện"), đánh dấu {@code period.stale = true} —
 * TÁI DÙNG đúng cờ QĐ-03 đã có sẵn ý nghĩa "báo cáo đang hiển thị đã lỗi
 * thời, cần tính lại" và ĐÃ được frontend hiển thị (xem
 * {@code ProductionReportPage.tsx}), không phải cờ mới/ẩn. Người vận hành
 * thấy kỳ "stale" trên UI, tự bấm nút "Tính lại kỳ" (đã có sẵn) sau khi xử
 * lý xong nguyên nhân lỗi (vd khai bổ sung định mức thiếu) — không cần cơ
 * chế retry/outbox mới: chính hành động tính lại thủ công đó XOÁ cờ stale
 * khi thành công (xem {@code ProductionCalculationService}/luồng mở khoá
 * QĐ-03 đã tắt cờ này theo đúng cách tương tự). KHÔNG retry tự động có giới
 * hạn — đa số lỗi ở đây (thiếu định mức, kỳ đã chốt) cần con người xử lý
 * trước, retry tự động vô nghĩa cho tới khi đó.
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
        } catch (PeriodNotFullyApprovedException e) {
            // Bình thường (kỳ đang duyệt dở) — xem javadoc lớp. KHÔNG log lỗi.
            log.debug("Kỳ {} (id={}) chưa đủ điều kiện để tự động tính lại: {}",
                    period.getDisplayName(), periodId, e.getMessage());
        } catch (BadRequestException e) {
            // Lỗi nghiệp vụ/dữ liệu THẬT (kỳ đã chốt, chưa có chuyến, hở
            // tháng, tra trượt định mức...) — PHẢI observable, không phải
            // trạng thái "đang duyệt dở" như trên. Transaction duyệt gốc đã
            // COMMIT, không rollback được — chỉ log lỗi để xử lý tay.
            log.error("Kỳ {} (id={}) tự động tính lại thất bại (lỗi nghiệp vụ/dữ liệu): {}",
                    period.getDisplayName(), periodId, e.getMessage());
            markStale(period);
        } catch (Exception e) {
            // Transaction gốc (duyệt) đã COMMIT xong, không rollback được nữa —
            // chỉ log lỗi thật để biết mà xử lý tay, không được throw tiếp (sẽ
            // không ai bắt được, chỉ tạo stacktrace vô ích trong log listener).
            log.error("Lỗi không mong đợi khi tự động tính lại kỳ {} (id={})",
                    period.getDisplayName(), periodId, e);
            markStale(period);
        }
    }

    /**
     * Đánh dấu kỳ "lỗi thời" sau khi tự động tính lại thất bại thật — xem
     * javadoc lớp. Tự tắt lại khi {@code ProductionCalculationService
     * .calculatePeriod} tính thành công LẦN SAU (thủ công hoặc tự động).
     */
    private void markStale(ReportPeriod period) {
        if (!period.isStale()) {
            period.setStale(true);
            reportPeriodRepository.save(period);
        }
    }
}
