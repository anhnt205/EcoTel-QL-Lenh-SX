package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * {@code ProductionCalculationService.calculatePeriod} — hai ràng buộc mới
 * thêm sau Quality Gate của Codex (2026-09-07): kỳ đã CHỐT bị từ chối tính
 * lại (QĐ-03), và tháng HỞ (chưa đủ Kỳ báo cáo phủ kín) cũng bị từ chối
 * (QĐ-05). Cả hai phải chặn TRƯỚC KHI đụng tới dữ liệu chuyến — verify bằng
 * {@code verifyNoInteractions} trên các repository dùng ở bước sau, để một
 * lần lỡ tay đảo thứ tự kiểm tra trong tương lai sẽ làm test đỏ ngay,
 * không phải một lần "tưởng chặn nhưng đã tính nửa chừng rồi mới chặn".
 *
 * <p>Chạy THUẦN Mockito (không {@code @SpringBootTest}), cùng lý do với
 * {@code ProductionKeysTest}: {@code contextLoads} vốn đã fail khi không có
 * Postgres/Redis sống (quy tắc dự án mục 3).
 */
@ExtendWith(MockitoExtension.class)
class ProductionCalculationServiceLockTest {

    @Mock private ReportPeriodRepository periodRepository;
    @Mock private TransportReportTripRepository tripRepository;
    @Mock private SurveyStandardRepository surveyStandardRepository;
    @Mock private SurveyCoefficientRepository coefficientRepository;
    @Mock private ProductionResultRepository resultRepository;
    @Mock private ReconciliationDecisionRepository reconciliationDecisionRepository;
    @Mock private TripBaseCalculator baseCalculator;
    @Mock private FuelCalculator fuelCalculator;
    @Mock private MatrixCatalogService matrixService;

    private ProductionCalculationService newService() {
        return new ProductionCalculationService(periodRepository, tripRepository,
                surveyStandardRepository, coefficientRepository, resultRepository,
                reconciliationDecisionRepository, baseCalculator, fuelCalculator, matrixService);
    }

    private static ReportPeriod period(int year, int month, int index,
                                       LocalDate from, LocalDate to, boolean locked) {
        ReportPeriod p = new ReportPeriod();
        p.setId(1L);
        p.setYear(year);
        p.setMonth(month);
        p.setPeriodIndex(index);
        p.setFromDate(from);
        p.setToDate(to);
        p.setLocked(locked);
        p.setDisplayName("Kỳ " + index);
        return p;
    }

    @Nested
    @DisplayName("QĐ-03 — kỳ đã chốt từ chối tính lại")
    class LockedPeriod {

        @Test
        @DisplayName("locked=true -> BadRequestException, KHÔNG đụng tới dữ liệu chuyến")
        void rejectsLockedPeriodBeforeTouchingTrips() {
            ReportPeriod locked = period(2026, 8, 1,
                    LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 7), true);
            when(periodRepository.findById(1L)).thenReturn(Optional.of(locked));

            assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đã chốt");

            verifyNoInteractions(tripRepository, resultRepository, coefficientRepository);
        }

        @Test
        @DisplayName("locked=false, tháng phủ kín -> KHÔNG bị chặn ở bước này (đi tiếp tới bước sau)")
        void allowsUnlockedPeriod() {
            LocalDate from = LocalDate.of(2026, 8, 1);
            LocalDate to = LocalDate.of(2026, 8, 31);
            ReportPeriod open = period(2026, 8, 1, from, to, false);
            when(periodRepository.findById(1L)).thenReturn(Optional.of(open));
            when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 8))
                    .thenReturn(List.of(open));
            when(tripRepository.findByReportDateBetween(from, to)).thenReturn(List.of());

            // Không chốt, không hở -> đi tiếp tới bước "chưa có chuyến nào" (khác lỗi khoá/hở).
            assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("chưa có chuyến vận tải nào");
        }
    }

    @Nested
    @DisplayName("QĐ-05 — tháng HỞ từ chối tính, không phụ thuộc kỳ nào đang chọn")
    class GapInMonth {

        @Test
        @DisplayName("chỉ khai 1 kỳ đầu tháng (1-7/8), tháng 8 có 31 ngày -> hở từ 8/8, chặn TRƯỚC khi đọc chuyến")
        void rejectsWhenMonthHasGapAfterLastPeriod() {
            LocalDate from = LocalDate.of(2026, 8, 1);
            LocalDate to = LocalDate.of(2026, 8, 7);
            ReportPeriod onlyPeriod = period(2026, 8, 1, from, to, false);
            when(periodRepository.findById(1L)).thenReturn(Optional.of(onlyPeriod));
            when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 8))
                    .thenReturn(List.of(onlyPeriod));

            assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("HỞ")
                    .hasMessageContaining("2026-08-08");

            verifyNoInteractions(tripRepository, resultRepository, coefficientRepository);
        }

        @Test
        @DisplayName("hở ở GIỮA tháng (thiếu kỳ 2) -> vẫn bắt được, không chỉ đầu/cuối tháng")
        void rejectsGapInTheMiddleOfMonth() {
            LocalDate from = LocalDate.of(2026, 8, 15);
            LocalDate to = LocalDate.of(2026, 8, 31);
            ReportPeriod firstPeriod = period(2026, 8, 1,
                    LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 7), false);
            ReportPeriod lastPeriod = period(2026, 8, 3, from, to, false);
            when(periodRepository.findById(1L)).thenReturn(Optional.of(lastPeriod));
            // Cố ý thiếu kỳ 8/8..14/8 -> hở giữa hai kỳ đã khai.
            when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 8))
                    .thenReturn(List.of(firstPeriod, lastPeriod));

            assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("HỞ")
                    .hasMessageContaining("2026-08-08")
                    .hasMessageContaining("2026-08-14");
        }

        @Test
        @DisplayName("đủ kỳ phủ kín cả tháng (kể cả tháng 2, 28 ngày) -> không ném lỗi hở")
        void allowsFullyCoveredMonth() {
            LocalDate from = LocalDate.of(2026, 2, 1);
            LocalDate to = LocalDate.of(2026, 2, 28);
            ReportPeriod onlyPeriod = period(2026, 2, 1, from, to, false);
            when(periodRepository.findById(1L)).thenReturn(Optional.of(onlyPeriod));
            when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 2))
                    .thenReturn(List.of(onlyPeriod));
            when(tripRepository.findByReportDateBetween(from, to)).thenReturn(List.of());

            // Đi tiếp qua vòng kiểm tra hở, dừng ở bước sau (khác thông báo "HỞ").
            assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("chưa có chuyến vận tải nào");
        }
    }
}
