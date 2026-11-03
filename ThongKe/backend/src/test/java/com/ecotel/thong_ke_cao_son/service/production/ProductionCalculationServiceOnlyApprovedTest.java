package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.ProductionReportSummaryResponse;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.exception.PeriodNotFullyApprovedException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FlushModeType;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * QĐ-25 (nới QĐ-16, chủ dự án chốt 2026-11-04): "những phần nào khớp và được
 * duyệt thì tính sản lượng theo cái đó". {@code calculatePeriod(..., onlyApproved=true)}
 * bỏ qua chuyến chưa duyệt thay vì từ chối cả kỳ; mặc định (2 tham số, và
 * tính lại tự động) vẫn NGHIÊM NGẶT như QĐ-16. Các test cổng duyệt cũ nằm ở
 * {@link ProductionCalculationServiceApprovalGateTest} — file này chỉ thêm
 * ca "chỉ tính phần đã duyệt" và con số báo lại trên màn Báo cáo.
 *
 * <p>Thuần Mockito, cùng lý do với các test cùng thư mục.
 */
@ExtendWith(MockitoExtension.class)
class ProductionCalculationServiceOnlyApprovedTest {

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

    private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);

    private static ReportPeriod openPeriod() {
        ReportPeriod p = new ReportPeriod();
        p.setId(1L);
        p.setYear(2026);
        p.setMonth(9);
        p.setPeriodIndex(1);
        p.setFromDate(FROM);
        p.setToDate(TO);
        p.setLocked(false);
        p.setDisplayName("Kỳ 01");
        return p;
    }

    private static TransportReportTrip transportTrip(long id, ApprovalStatus status) {
        Device vehicle = new Device();
        vehicle.setId(100L);
        vehicle.setCode("XE" + id);
        TransportReport report = new TransportReport();
        report.setReportDate(FROM);
        report.setVehicle(vehicle);
        TransportReportTrip trip = new TransportReportTrip();
        trip.setId(id);
        trip.setTransportReport(report);
        trip.setStatus(status);
        return trip;
    }

    private static ExcavationReportTrip excavationTrip(long id, ApprovalStatus status) {
        ExcavationReportTrip trip = new ExcavationReportTrip();
        trip.setId(id);
        trip.setStatus(status);
        return trip;
    }

    private static ReconciliationDecision decisionFor(TransportReportTrip tt, ExcavationReportTrip et) {
        ReconciliationDecision d = new ReconciliationDecision();
        d.setTransportReportTrip(tt);
        d.setExcavationReportTrip(et);
        d.setStatus(ApprovalStatus.APPROVED);
        return d;
    }

    private void stubOpenPeriodWithTrips(List<TransportReportTrip> trips) {
        ReportPeriod period = openPeriod();
        when(periodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 9)).thenReturn(List.of(period));
        when(tripRepository.findByReportDateBetween(FROM, TO)).thenReturn(trips);
    }

    @Test
    @DisplayName("onlyApproved: cặp đã duyệt được đưa vào tính, chuyến PENDING và chuyến duyệt một phía bị bỏ qua (không từ chối cả kỳ)")
    void onlyApprovedKeepsApprovedPairsAndSkipsTheRest() {
        TransportReportTrip approved = transportTrip(1L, ApprovalStatus.APPROVED);
        TransportReportTrip pending = transportTrip(2L, ApprovalStatus.PENDING);
        TransportReportTrip oneSided = transportTrip(3L, ApprovalStatus.APPROVED);
        stubOpenPeriodWithTrips(List.of(approved, pending, oneSided));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 2L, 3L)))
                .thenReturn(List.of(decisionFor(approved, excavationTrip(11L, ApprovalStatus.APPROVED))));

        // Phần tính toán phía sau (hệ số/nhiên liệu) không phải trọng tâm và không được
        // stub đầy đủ nên có thể ném lỗi; điều cần chứng minh là gate KHÔNG từ chối và
        // engine chỉ đưa ĐÚNG chuyến đã duyệt vào bước tính.
        try {
            newService().calculatePeriod(1L, true, true);
        } catch (Exception e) {
            assertThat(e).as("lỗi (nếu có) phải thuộc bước SAU gate duyệt")
                    .isNotInstanceOf(PeriodNotFullyApprovedException.class);
        }

        verify(resultRepository).deleteByPeriod(1L);
        verify(baseCalculator).calculate(approved);
        verify(baseCalculator, never()).calculate(pending);
        verify(baseCalculator, never()).calculate(oneSided);
    }

    @Test
    @DisplayName("onlyApproved nhưng KHÔNG có chuyến nào đã duyệt -> báo lỗi rõ, không xoá kết quả cũ")
    void onlyApprovedWithNothingApprovedStillRefuses() {
        TransportReportTrip pending = transportTrip(1L, ApprovalStatus.PENDING);
        stubOpenPeriodWithTrips(List.of(pending));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());

        assertThatThrownBy(() -> newService().calculatePeriod(1L, true, true))
                .isInstanceOf(PeriodNotFullyApprovedException.class)
                .hasMessageContaining("chưa có chuyến Vận tải nào đã duyệt");

        verify(resultRepository, never()).deleteByPeriod(1L);
        verify(baseCalculator, never()).calculate(any());
    }

    @Test
    @DisplayName("Mặc định (không onlyApproved) vẫn NGHIÊM NGẶT QĐ-16: còn chuyến chưa duyệt -> từ chối cả kỳ")
    void defaultModeStaysStrict() {
        TransportReportTrip approved = transportTrip(1L, ApprovalStatus.APPROVED);
        TransportReportTrip pending = transportTrip(2L, ApprovalStatus.PENDING);
        stubOpenPeriodWithTrips(List.of(approved, pending));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 2L)))
                .thenReturn(List.of(decisionFor(approved, excavationTrip(11L, ApprovalStatus.APPROVED))));

        assertThatThrownBy(() -> newService().calculatePeriod(1L, true))
                .isInstanceOf(PeriodNotFullyApprovedException.class)
                .hasMessageContaining("CHƯA ĐƯỢC DUYỆT ĐỐI CHIẾU");

        verify(resultRepository, never()).deleteByPeriod(1L);
        verify(baseCalculator, never()).calculate(any());
    }

    @Test
    @DisplayName("Màn Báo cáo: số chuyến chưa duyệt = tổng chuyến của kỳ trừ số chuyến đã tính")
    void summaryReportsTripsLeftOutOfTheCalculation() {
        ReportPeriod period = openPeriod();
        when(periodRepository.findById(1L)).thenReturn(Optional.of(period));
        ProductionResult r1 = new ProductionResult();
        ProductionResult r2 = new ProductionResult();
        when(resultRepository.findAllByPeriod(1L)).thenReturn(List.of(r1, r2));
        when(tripRepository.countByReportDateBetween(FROM, TO)).thenReturn(10L);

        ProductionReportSummaryResponse summary =
                new ProductionReportService(resultRepository, periodRepository, tripRepository).getSummary(1L);

        assertThat(summary.getRowCount()).isEqualTo(2);
        assertThat(summary.getUnapprovedTripCount()).isEqualTo(8);
    }

    @Test
    @DisplayName("Màn Báo cáo: kỳ chưa tính lần nào -> không báo số chuyến chưa duyệt (chưa có gì để so)")
    void summaryOfUncalculatedPeriodHasNoUnapprovedCount() {
        when(periodRepository.findById(1L)).thenReturn(Optional.of(openPeriod()));
        when(resultRepository.findAllByPeriod(1L)).thenReturn(List.of());

        ProductionReportSummaryResponse summary =
                new ProductionReportService(resultRepository, periodRepository, tripRepository).getSummary(1L);

        assertThat(summary.getRowCount()).isZero();
        assertThat(summary.getUnapprovedTripCount()).isZero();
    }

    @Test
    @DisplayName("Cảnh báo nhiên liệu/năng suất được gộp theo nguyên nhân kèm số chuyến (không in hàng nghìn dòng)")
    void fuelWarningsAreSummarisedByReasonWithCounts() {
        List<String> warnings = List.of(
                "Chuyến id=1: lưới Năng suất xe chưa có ô [3 × CAT777.DAT].",
                "Chuyến id=2: lưới Năng suất xe chưa có ô [3 × CAT777.DAT].",
                "Chuyến id=3: lưới Năng suất xe chưa có ô [3 × VOLVOA40-GCoi.DAT].");

        String notice = ProductionCalculationService.summarizeFuelWarnings(warnings);

        assertThat(notice).contains("[3 × CAT777.DAT]. (2 chuyến)")
                .contains("[3 × VOLVOA40-GCoi.DAT]. (1 chuyến)")
                .contains("3 lượt tra")
                .doesNotContain("Chuyến id=");
    }

    @Test
    @DisplayName("Hiệu năng: lúc tính chuyển FlushMode.COMMIT (tránh dirty-check toàn bộ thực thể mỗi truy vấn) và LUÔN trả lại chế độ cũ, kể cả khi lỗi")
    void flushModeIsCommitWhileCalculatingAndRestoredAfterwards() {
        EntityManager entityManager = org.mockito.Mockito.mock(EntityManager.class);
        when(entityManager.getFlushMode()).thenReturn(FlushModeType.AUTO);
        ProductionCalculationService service = newService();
        org.springframework.test.util.ReflectionTestUtils.setField(service, "entityManager", entityManager);
        when(periodRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.calculatePeriod(1L, true, true))
                .isInstanceOf(com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException.class);

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(entityManager);
        order.verify(entityManager).setFlushMode(FlushModeType.COMMIT);
        order.verify(entityManager).setFlushMode(FlushModeType.AUTO);
    }
}
