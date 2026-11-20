package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Chủ dự án chốt 2026-11-16: mỗi chuyến tính m3/tấn/tkm → cộng theo khoá (bảng Áp trắc địa) → ba hệ số
 * → áp ngược đúng hệ số tương ứng cho từng chuyến, nên Thống kê sản lượng và Áp trắc địa là MỘT dữ liệu:
 * tổng m3/tấn/tkm trắc địa của các chuyến cùng khoá phải BẰNG số trắc địa (STD) của khoá đó — cả ba chỉ tiêu.
 */
@ExtendWith(MockitoExtension.class)
class ProductionCalculationSurveyTotalsTest {

    @Mock private ReportPeriodRepository periodRepository;
    @Mock private TransportReportTripRepository tripRepository;
    @Mock private SurveyStandardRepository surveyStandardRepository;
    @Mock private SurveyCoefficientRepository coefficientRepository;
    @Mock private ProductionResultRepository resultRepository;
    @Mock private ReconciliationDecisionRepository reconciliationDecisionRepository;
    @Mock private TripBaseCalculator baseCalculator;
    @Mock private FuelCalculator fuelCalculator;
    @Mock private MatrixCatalogService matrixService;

    private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);
    private static final String KEY = "VIA1_MX01";

    private static TransportReportTrip trip(long id) {
        Device vehicle = new Device();
        vehicle.setId(100L);
        vehicle.setCode("XE" + id);
        TransportReport report = new TransportReport();
        report.setReportDate(FROM);
        report.setVehicle(vehicle);
        TransportReportTrip t = new TransportReportTrip();
        t.setId(id);
        t.setTransportReport(report);
        t.setStatus(ApprovalStatus.APPROVED);
        return t;
    }

    private static ReconciliationDecision approvedDecision(TransportReportTrip tt) {
        ExcavationReportTrip et = new ExcavationReportTrip();
        et.setId(tt.getId() + 1000);
        et.setStatus(ApprovalStatus.APPROVED);
        ReconciliationDecision d = new ReconciliationDecision();
        d.setTransportReportTrip(tt);
        d.setExcavationReportTrip(et);
        d.setStatus(ApprovalStatus.APPROVED);
        return d;
    }

    private static TripBaseResult base(TransportReportTrip t, String m3, String ton, String tkm) {
        return TripBaseResult.builder()
                .trip(t)
                .productionDate(FROM)
                .seamGroupExcavatorKey(KEY)
                .acceptanceProduct("Dat_CN")
                .density(new BigDecimal("1.8"))
                .model(BigDecimal.ONE)
                .totalM3(new BigDecimal(m3))
                .totalTon(new BigDecimal(ton))
                .totalTkm(new BigDecimal(tkm))
                .build();
    }

    @Test
    @DisplayName("tổng m3, tấn, tkm trắc địa của các chuyến cùng khoá = STD của khoá, kể cả khi STD tấn/tkm KHÔNG bằng m3 × thể trọng")
    void surveyTotalsPerKeyEqualStdForAllThreeMeasures() {
        ReportPeriod period = new ReportPeriod();
        period.setId(1L);
        period.setYear(2026);
        period.setMonth(9);
        period.setPeriodIndex(1);
        period.setFromDate(FROM);
        period.setToDate(TO);
        period.setLocked(false);
        period.setDisplayName("Kỳ 01");
        when(periodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(2026, 9)).thenReturn(List.of(period));

        TransportReportTrip t1 = trip(1L);
        TransportReportTrip t2 = trip(2L);
        when(tripRepository.findByReportDateBetween(FROM, TO)).thenReturn(List.of(t1, t2));
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 2L)))
                .thenReturn(List.of(approvedDecision(t1), approvedDecision(t2)));

        // Hai chuyến cùng khoá: tổng m3 = 100, tấn = 180, tkm = 900.
        when(baseCalculator.calculate(t1)).thenReturn(base(t1, "40", "72", "360"));
        when(baseCalculator.calculate(t2)).thenReturn(base(t2, "60", "108", "540"));

        // STD cố tình lệch: tấn 1850/10 (≠ m3 × thể trọng), tkm 9500/10.
        SurveyStandard std = new SurveyStandard();
        std.setEarthM3(new BigDecimal("1000"));
        std.setEarthTon(new BigDecimal("1850"));
        std.setEarthTkm(new BigDecimal("9500"));
        std.setEarthBulkDensity(new BigDecimal("1.8"));
        when(surveyStandardRepository.findEffective(any(SurveyStandard.CatalogType.class), any(), any()))
                .thenReturn(Optional.of(std));

        // Lưới nhiên liệu chưa khai: ở chế độ onlyApproved chỉ để trống nhiên liệu, không chặn sản lượng.
        when(matrixService.getGridAt(any(), any())).thenThrow(new RuntimeException("chưa khai"));

        new ProductionCalculationService(periodRepository, tripRepository, surveyStandardRepository,
                coefficientRepository, resultRepository, reconciliationDecisionRepository,
                baseCalculator, fuelCalculator, matrixService)
                .calculatePeriod(1L, true);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ProductionResult>> captor = ArgumentCaptor.forClass(List.class);
        verify(resultRepository).saveAll(captor.capture());
        List<ProductionResult> results = captor.getValue();
        assertThat(results).hasSize(2);

        BigDecimal sumM3 = results.stream().map(ProductionResult::getSurveyM3).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumTon = results.stream().map(ProductionResult::getSurveyTon).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumTkm = results.stream().map(ProductionResult::getSurveyTkm).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sumM3).isCloseTo(new BigDecimal("1000"), org.assertj.core.data.Offset.offset(new BigDecimal("0.001")));
        assertThat(sumTon).isCloseTo(new BigDecimal("1850"), org.assertj.core.data.Offset.offset(new BigDecimal("0.001")));
        assertThat(sumTkm).isCloseTo(new BigDecimal("9500"), org.assertj.core.data.Offset.offset(new BigDecimal("0.001")));

        // Từng chuyến nhận ĐÚNG hệ số tương ứng của khoá (HS tấn = 1850/180, không phải HS m3).
        ProductionResult r1 = results.get(0);
        assertThat(r1.getSurveyTon()).isEqualByComparingTo(
                new BigDecimal("72").multiply(r1.getHsTon()).setScale(6, java.math.RoundingMode.HALF_UP));
        assertThat(r1.getHsTon()).isNotEqualByComparingTo(r1.getHsM3());
    }
}
