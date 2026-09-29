package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.exception.PeriodNotFullyApprovedException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@code ProductionCalculationService.calculatePeriod} — gate duyệt đối
 * chiếu KHÔNG được chỉ tin {@code TransportReportTrip.status == APPROVED}
 * (Quality Gate lượt 7 của Codex, 2026-09-16). Lỗ hổng thật: trước đây chỉ
 * đọc cờ đó, hoàn toàn không xác minh chuyến Khai thác GHÉP CẶP có tồn tại
 * hay đã duyệt hay chưa — 1 chuyến Vận tải duyệt RIÊNG LẺ (không hợp lệ,
 * giờ đã chặn ở nguồn tại {@code ReconciliationService.buildDecision}, xem
 * {@code ReconciliationServiceDepartmentScopeTest.PairingAmbiguity}) vẫn lọt
 * được vào tính sản lượng nếu bằng cách nào đó cờ APPROVED bật lên. File
 * này test ĐỘC LẬP ở tầng {@code ProductionCalculationService} — tự vệ
 * (defense in depth), không tin ngược dữ liệu/đường ghi khác.
 *
 * <p>Chạy THUẦN Mockito, cùng lý do với {@code ProductionCalculationServiceLockTest}.
 */
@ExtendWith(MockitoExtension.class)
class ProductionCalculationServiceApprovalGateTest {

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

    private static final LocalDate FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate TO = LocalDate.of(2026, 8, 31);

    private static ReportPeriod openPeriod() {
        ReportPeriod p = new ReportPeriod();
        p.setId(1L);
        p.setYear(2026);
        p.setMonth(8);
        p.setPeriodIndex(1);
        p.setFromDate(FROM);
        p.setToDate(TO);
        p.setLocked(false);
        p.setDisplayName("Kỳ 1");
        return p;
    }

    private static TransportReportTrip transportTrip(long id, ApprovalStatus status) {
        Device vehicle = new Device();
        vehicle.setId(100L);
        vehicle.setCode("XE01");
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
        when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 8)).thenReturn(List.of(period));
        when(tripRepository.findByReportDateBetween(FROM, TO)).thenReturn(trips);
    }

    @Test
    @DisplayName("Vận tải APPROVED nhưng KHÔNG có chuyến Khai thác ghép cặp (không có quyết định đối chiếu nào) -> không được tính")
    void transportApprovedWithoutPairedExcavationBlocksCalculation() {
        TransportReportTrip trip = transportTrip(1L, ApprovalStatus.APPROVED);
        stubOpenPeriodWithTrips(List.of(trip));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L))).thenReturn(List.of());

        assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                .isInstanceOf(PeriodNotFullyApprovedException.class)
                .hasMessageContaining("CHƯA có chuyến Khai thác ghép cặp");

        verify(resultRepository, org.mockito.Mockito.never()).deleteByPeriod(1L);
    }

    @Test
    @DisplayName("Vận tải APPROVED, có chuyến Khai thác ghép cặp nhưng CHƯA duyệt -> không được tính")
    void transportApprovedButExcavationNotApprovedBlocksCalculation() {
        TransportReportTrip trip = transportTrip(1L, ApprovalStatus.APPROVED);
        ExcavationReportTrip excavation = excavationTrip(9L, ApprovalStatus.PENDING);
        stubOpenPeriodWithTrips(List.of(trip));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L)))
                .thenReturn(List.of(decisionFor(trip, excavation)));

        assertThatThrownBy(() -> newService().calculatePeriod(1L, false))
                .isInstanceOf(PeriodNotFullyApprovedException.class)
                .hasMessageContaining("CHƯA được duyệt");

        verify(resultRepository, org.mockito.Mockito.never()).deleteByPeriod(1L);
    }

    @Test
    @DisplayName("Cặp hợp lệ, CẢ HAI bên đã APPROVED -> qua được gate duyệt (đi tiếp tới bước tính toán)")
    void validPairBothApprovedPassesApprovalGate() {
        TransportReportTrip trip = transportTrip(1L, ApprovalStatus.APPROVED);
        ExcavationReportTrip excavation = excavationTrip(9L, ApprovalStatus.APPROVED);
        stubOpenPeriodWithTrips(List.of(trip));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L)))
                .thenReturn(List.of(decisionFor(trip, excavation)));

        // Gate duyệt KHÔNG được chặn ở đây — phần tính toán phía sau (base
        // calculator/hệ số/nhiên liệu) không phải trọng tâm test này nên
        // KHÔNG stub đầy đủ, có thể ném lỗi/NPE ở bước sau. Điều cần chứng
        // minh CHỈ là: đã qua được gate duyệt (resultRepository.deleteByPeriod
        // đã chạy — dòng NGAY SAU gate, TRƯỚC toàn bộ phần tính toán).
        try {
            newService().calculatePeriod(1L, false);
        } catch (Exception e) {
            assertThat(e).as("nếu có lỗi thì phải là lỗi bước SAU gate duyệt, không phải lỗi duyệt đối chiếu")
                    .isNotInstanceOf(PeriodNotFullyApprovedException.class);
        }

        verify(resultRepository).deleteByPeriod(1L);
    }
}
