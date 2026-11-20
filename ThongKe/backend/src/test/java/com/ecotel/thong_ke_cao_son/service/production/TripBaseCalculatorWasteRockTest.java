package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.service.CoalCoefficientService;
import com.ecotel.thong_ke_cao_son.service.DensityParameterService;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import com.ecotel.thong_ke_cao_son.service.WasteRockCoefficientService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Đá thải (chủ dự án chốt 2026-11-16):
 * <ul>
 *   <li>Đá thải (tấn): Nhóm chủng loại hàng ≠ THANV → 0; = THANV → giá trị tự nhập (Báo chuyến) × Tổng KLVC TKE ban đầu
 *       chưa trừ đá (CK).</li>
 *   <li>Đá thải (m3): khu vực KC → tấn ÷ 2,625; khu vực CS → tấn ÷ 2,617.</li>
 *   <li>Tổng KLVC (tấn) = Tổng m3 × Tỷ trọng − Đá thải (tấn).</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class TripBaseCalculatorWasteRockTest {

    @Mock private DensityParameterService densityService;
    @Mock private MatrixCatalogService matrixService;
    @Mock private CoalCoefficientService coalCoefficientService;
    @Mock private WasteRockCoefficientService wasteRockCoefficientService;

    private static final LocalDate DAY = LocalDate.of(2026, 9, 5);

    private TripBaseCalculator calculator() {
        return new TripBaseCalculator(densityService, matrixService, coalCoefficientService, wasteRockCoefficientService);
    }

    /** Chuyến than (Than_CN → Phân loại THAN) 10 chuyến, Mô hình tạm tính 30, Tỷ trọng ban đầu 2, không trừ vơi. */
    private TransportReportTrip trip(String cargoGroupName, String areaGroup, String wasteRockInput) {
        CargoGroup group = new CargoGroup();
        group.setName(cargoGroupName);
        AcceptanceProduct product = new AcceptanceProduct();
        product.setName("Than_CN");
        CargoType cargoType = new CargoType();
        cargoType.setId(1L);
        cargoType.setName("Than test");
        cargoType.setCargoGroup(group);
        cargoType.setAcceptanceProduct(product);

        ExcavationArea area = new ExcavationArea();
        area.setId(5L);
        area.setCode("X");
        area.setAreaGroup(areaGroup);

        TransportReport report = new TransportReport();
        report.setReportDate(DAY);

        TransportReportTrip t = new TransportReportTrip();
        t.setId(7L);
        t.setTransportReport(report);
        t.setCargoType(cargoType);
        t.setExcavationArea(area);
        t.setTripCount(10);
        t.setProvisionalModel(new BigDecimal("30"));
        t.setWasteRockTon(wasteRockInput == null ? null : new BigDecimal(wasteRockInput));
        return t;
    }

    private void stubDensity() {
        DensityParameter d = new DensityParameter();
        d.setDensityWet(new BigDecimal("2"));
        d.setDensityDry(new BigDecimal("1.9"));
        when(densityService.findEffective(any(), any(), any())).thenReturn(Optional.of(d));
    }

    @Test
    @DisplayName("THANV: Đá thải (tấn) = giá trị nhập × CK; Đá thải (m3) = tấn ÷ hệ số của khu vực xúc trong danh mục (vd 2,625); Tổng KLVC trừ đúng đá thải")
    void thanvKc() {
        stubDensity();
        when(wasteRockCoefficientService.coefficientFor(any(), any())).thenReturn(Optional.of(new BigDecimal("2.625")));

        TripBaseResult r = calculator().calculate(trip("THANV", "KC", "0.05"));

        // CK = ROUND(2 × 30 × 10 − 0, 5) = 600
        assertThat(r.getTonOriginalBeforeWaste()).isEqualByComparingTo("600");
        assertThat(r.getWasteRockTon()).isEqualByComparingTo("30");                 // 0,05 × 600
        assertThat(r.getWasteRockM3()).isEqualByComparingTo(new BigDecimal("30").divide(new BigDecimal("2.625"), 6, java.math.RoundingMode.HALF_UP));
        // Tổng m3 = 30 × 10 = 300 → Tổng KLVC = 300 × 2 − 30 = 570
        assertThat(r.getTotalTon()).isEqualByComparingTo("570");
    }

    @Test
    @DisplayName("hệ số khác theo khu vực: danh mục khai 2,617 thì Đá thải (m3) = tấn ÷ 2,617 (không còn cứng 2,625/2,617 trong code)")
    void thanvOtherCoefficient() {
        stubDensity();
        when(wasteRockCoefficientService.coefficientFor(any(), any())).thenReturn(Optional.of(new BigDecimal("2.617")));

        TripBaseResult r = calculator().calculate(trip("THANV", "CS", "0.05"));

        assertThat(r.getWasteRockTon()).isEqualByComparingTo("30");
        assertThat(r.getWasteRockM3()).isEqualByComparingTo(new BigDecimal("30").divide(new BigDecimal("2.617"), 6, java.math.RoundingMode.HALF_UP));
    }

    @Test
    @DisplayName("danh mục Hệ số đá thải chưa có dòng cho khu vực + tháng → Đá thải (m3) TRỐNG (null), Đá thải (tấn) và Tổng KLVC vẫn tính")
    void missingCoefficientLeavesM3Empty() {
        stubDensity();
        when(wasteRockCoefficientService.coefficientFor(any(), any())).thenReturn(Optional.empty());

        TripBaseResult r = calculator().calculate(trip("THANV", "KC", "0.05"));

        assertThat(r.getWasteRockTon()).isEqualByComparingTo("30");
        assertThat(r.getWasteRockM3()).isNull();
        assertThat(r.getTotalTon()).isEqualByComparingTo("570");
    }

    @Test
    @DisplayName("nhóm chủng loại hàng KHÁC THANV: Đá thải = 0 dù có nhập giá trị; Tổng KLVC không bị trừ")
    void otherGroupIsZero() {
        stubDensity();

        TripBaseResult r = calculator().calculate(trip("DAT", "KC", "0.05"));

        assertThat(r.getWasteRockTon()).isEqualByComparingTo("0");
        assertThat(r.getWasteRockM3()).isEqualByComparingTo("0");
        assertThat(r.getTotalTon()).isEqualByComparingTo("600");
    }

    @Test
    @DisplayName("THANV nhưng chưa nhập Đá thải → 0")
    void thanvWithoutInput() {
        stubDensity();

        TripBaseResult r = calculator().calculate(trip("THANV", "KC", null));

        assertThat(r.getWasteRockTon()).isEqualByComparingTo("0");
        assertThat(r.getTotalTon()).isEqualByComparingTo("600");
    }

    @Test
    @DisplayName("THANV có nhập Đá thải nhưng danh mục Tỷ trọng không có dòng cho chủng loại hàng (dùng Tỷ trọng cập nhật) → báo lỗi, không âm thầm bằng 0")
    void thanvWithoutCatalogDensityIsRejected() {
        when(densityService.findEffective(any(), any(), any())).thenReturn(Optional.empty());
        TransportReportTrip t = trip("THANV", "KC", "0.05");
        t.setProvisionalDensity(new BigDecimal("2"));

        assertThatThrownBy(() -> calculator().calculate(t))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Đá thải");
    }
}
