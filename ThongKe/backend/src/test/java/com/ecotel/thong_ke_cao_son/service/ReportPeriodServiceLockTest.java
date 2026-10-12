package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.enums.ReportPeriodAuditAction;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.mapper.ReportPeriodMapper;
import com.ecotel.thong_ke_cao_son.model.ProductionResult;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.model.ReportPeriodAudit;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodAuditRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Chốt/mở khoá kỳ (QĐ-03) — thêm sau Quality Gate của Codex (2026-09-07),
 * trước đó tính năng này KHÔNG TỒN TẠI (kỳ đã chốt vẫn tính lại vô tư).
 *
 * <p>Chạy THUẦN Mockito, cùng lý do với {@code ProductionKeysTest}.
 */
@ExtendWith(MockitoExtension.class)
class ReportPeriodServiceLockTest {

    @Mock private ReportPeriodRepository repository;
    @Mock private ReportPeriodMapper mapper;
    @Mock private ReportPeriodAuditRepository auditRepository;
    @Mock private ProductionResultRepository resultRepository;

    private ReportPeriodService service() {
        return new ReportPeriodService(repository, mapper, auditRepository, resultRepository);
    }

    private static ReportPeriod openPeriod() {
        ReportPeriod p = new ReportPeriod();
        p.setId(1L);
        p.setYear(2026);
        p.setMonth(8);
        p.setPeriodIndex(1);
        p.setDisplayName("Kỳ 01");
        p.setLocked(false);
        p.setStale(false);
        return p;
    }

    private static ProductionResult resultRow(boolean tke, String m3, String ton, String tkm) {
        ProductionResult r = new ProductionResult();
        r.setTkeMode(tke);
        r.setTotalM3(new BigDecimal(m3));
        r.setTotalTon(new BigDecimal(ton));
        r.setTotalTkm(new BigDecimal(tkm));
        return r;
    }

    @Nested
    @DisplayName("lock()")
    class Lock {

        @Test
        @DisplayName("chưa tính lần nào (không có ProductionResult) -> từ chối chốt")
        void rejectsLockingAnEmptyPeriod() {
            ReportPeriod p = openPeriod();
            when(repository.findById(1L)).thenReturn(Optional.of(p));
            when(resultRepository.findAllByPeriod(1L)).thenReturn(List.of());

            assertThatThrownBy(() -> service().lock(1L, "kt01", "Kỹ thuật 01"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("chưa có kết quả");

            verify(repository, never()).save(any());
            verifyNoInteractions(auditRepository);
        }

        @Test
        @DisplayName("đã chốt rồi -> từ chối chốt lần nữa")
        void rejectsDoubleLock() {
            ReportPeriod p = openPeriod();
            p.setLocked(true);
            when(repository.findById(1L)).thenReturn(Optional.of(p));

            assertThatThrownBy(() -> service().lock(1L, "kt01", "Kỹ thuật 01"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đã chốt rồi");
        }

        @Test
        @DisplayName("có kết quả -> locked=true, stale=false, ghi đúng MỘT vết LOCK kèm tổng số + người thực hiện")
        void locksAndRecordsAuditSnapshot() {
            ReportPeriod p = openPeriod();
            when(repository.findById(1L)).thenReturn(Optional.of(p));
            when(resultRepository.findAllByPeriod(1L)).thenReturn(List.of(
                    resultRow(false, "100", "150", "300"),
                    resultRow(false, "50", "75", "150")));

            service().lock(1L, "kt01", "Kỹ thuật 01");

            assertThat(p.isLocked()).isTrue();
            assertThat(p.isStale()).isFalse();
            verify(repository).save(p);

            ArgumentCaptor<ReportPeriodAudit> captor = ArgumentCaptor.forClass(ReportPeriodAudit.class);
            verify(auditRepository).save(captor.capture());
            ReportPeriodAudit audit = captor.getValue();
            assertThat(audit.getAction()).isEqualTo(ReportPeriodAuditAction.LOCK);
            assertThat(audit.getPerformedByUsername()).isEqualTo("kt01");
            assertThat(audit.getPerformedByFullName()).isEqualTo("Kỹ thuật 01");
            assertThat(audit.getTkeMode()).isFalse();
            assertThat(audit.getTotalM3()).isEqualByComparingTo("150");
            assertThat(audit.getTotalTon()).isEqualByComparingTo("225");
            assertThat(audit.getTotalTkm()).isEqualByComparingTo("450");
        }
    }

    @Nested
    @DisplayName("unlock()")
    class Unlock {

        @Test
        @DisplayName("chưa chốt -> từ chối mở khoá")
        void rejectsUnlockingAnOpenPeriod() {
            ReportPeriod p = openPeriod();
            when(repository.findById(1L)).thenReturn(Optional.of(p));

            assertThatThrownBy(() -> service().unlock(1L, "sửa nhầm", "admin", "Quản trị"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("chưa chốt");
        }

        @Test
        @DisplayName("đã chốt -> locked=false, stale=true, ghi vết UNLOCK kèm ĐÚNG lý do đã truyền")
        void unlocksAndRecordsReason() {
            ReportPeriod p = openPeriod();
            p.setLocked(true);
            when(repository.findById(1L)).thenReturn(Optional.of(p));
            when(resultRepository.findAllByPeriod(1L)).thenReturn(List.of(
                    resultRow(true, "10", "15", "30")));

            service().unlock(1L, "Đổi sang chế độ trắc địa theo yêu cầu Ban GĐ", "admin", "Quản trị");

            assertThat(p.isLocked()).isFalse();
            assertThat(p.isStale()).isTrue();
            verify(repository).save(p);

            ArgumentCaptor<ReportPeriodAudit> captor = ArgumentCaptor.forClass(ReportPeriodAudit.class);
            verify(auditRepository).save(captor.capture());
            ReportPeriodAudit audit = captor.getValue();
            assertThat(audit.getAction()).isEqualTo(ReportPeriodAuditAction.UNLOCK);
            assertThat(audit.getReason()).isEqualTo("Đổi sang chế độ trắc địa theo yêu cầu Ban GĐ");
            assertThat(audit.getPerformedByUsername()).isEqualTo("admin");
            assertThat(audit.getTkeMode()).isTrue();
        }
    }

    @Nested
    @DisplayName("update()/delete() — kỳ đã chốt là bất biến (bịt đường vòng qua sửa/xoá thay vì tính lại)")
    class ImmutableWhenLocked {

        @Test
        @DisplayName("delete() một kỳ đã chốt -> từ chối, KHÔNG xoá")
        void rejectsDeletingLockedPeriod() {
            ReportPeriod p = openPeriod();
            p.setLocked(true);
            when(repository.findById(1L)).thenReturn(Optional.of(p));

            assertThatThrownBy(() -> service().delete(1L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đã chốt");

            verify(repository, never()).delete(any());
        }
    }
}
