package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse.AxisEntry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Nội suy định mức nhiên liệu (chủ dự án chốt 2026-11-16, ví dụ trong tài liệu: cung độ 4,2 → Hb=4, Ha=4,5;
 * nâng tải 210 → h1=200, h2=250):
 * Nb = Nb-h1 + (Nb-h2 − Nb-h1) × (chênh cao − h1)/(h2 − h1); Na tương tự tại Ha;
 * Nt = Na − (Na − Nb)/(Hb − Ha) × (cung độ − Ha) — tức nội suy tuyến tính giữa Nb và Na theo cung độ.
 */
class FuelNormInterpolatorTest {

    private static final String VEHICLE = "CAT777E.DAT";

    private static BigDecimal d(String v) {
        return new BigDecimal(v);
    }

    private static AxisEntry axis(String key, String numeric) {
        return AxisEntry.builder().key(key).label(key).numericValue(numeric == null ? null : d(numeric)).build();
    }

    /**
     * Hai dòng độ dốc (200, 250) × hai cột cung độ (4, 4,5):
     * <pre>
     *            4      4,5
     *   200     10      20
     *   250     15      30
     * </pre>
     */
    private static MatrixGridResponse grid() {
        return MatrixGridResponse.builder()
                .rows(List.of(axis("R200", "200"), axis("R250", "250")))
                .cols(List.of(axis(VEHICLE + "_4", null), axis(VEHICLE + "_4.5", null)))
                .cells(Map.of(
                        "R200", Map.of(VEHICLE + "_4", d("10"), VEHICLE + "_4.5", d("20")),
                        "R250", Map.of(VEHICLE + "_4", d("15"), VEHICLE + "_4.5", d("30"))))
                .build();
    }

    @Test
    @DisplayName("ví dụ tài liệu: cung độ 4,2, nâng tải 210 → Hb=4, Ha=4,5, h1=200, h2=250; Nb=11, Na=22, Nt=15,4")
    void documentExample() {
        FuelNormInterpolator.Result r = FuelNormInterpolator.interpolate(grid(), VEHICLE, d("4.2"), d("210")).orElseThrow();

        assertThat(r.distanceLow()).isEqualByComparingTo("4");
        assertThat(r.distanceHigh()).isEqualByComparingTo("4.5");
        assertThat(r.slopeLow()).isEqualByComparingTo("200");
        assertThat(r.slopeHigh()).isEqualByComparingTo("250");
        // Nb-h1, Nb-h2 = ô lưới tại cung độ Hb; Na-h1, Na-h2 = ô lưới tại cung độ Ha
        assertThat(r.nbH1()).isEqualByComparingTo("10");
        assertThat(r.nbH2()).isEqualByComparingTo("15");
        assertThat(r.naH1()).isEqualByComparingTo("20");
        assertThat(r.naH2()).isEqualByComparingTo("30");
        // Nb = 10 + (15−10) × (210−200)/(250−200) = 11 ; Na = 20 + (30−20) × 0,2 = 22
        assertThat(r.nb()).isEqualByComparingTo("11");
        assertThat(r.na()).isEqualByComparingTo("22");
        // Nt = 11 + (22−11) × (4,2−4)/(4,5−4) = 15,4
        assertThat(r.value()).isEqualByComparingTo("15.4");
    }

    @Test
    @DisplayName("công thức văn bản của chủ dự án Nt = Na − (Na − Nb)/(Hb − Ha) × (cung độ − Ha) cho CÙNG kết quả")
    void textFormulaEqualsLinearInterpolation() {
        FuelNormInterpolator.Result r = FuelNormInterpolator.interpolate(grid(), VEHICLE, d("4.2"), d("210")).orElseThrow();

        BigDecimal viaText = r.na().subtract(
                r.na().subtract(r.nb())
                        .divide(r.distanceLow().subtract(r.distanceHigh()), 10, java.math.RoundingMode.HALF_UP)
                        .multiply(d("4.2").subtract(r.distanceHigh())));

        assertThat(viaText).isCloseTo(r.value(), org.assertj.core.data.Offset.offset(new BigDecimal("0.000001")));
    }

    @Test
    @DisplayName("chênh cao trùng đúng mốc dốc (h1 = h2) → Nb = Nb-h1, không nội suy theo dốc")
    void slopeOnBreakpoint() {
        FuelNormInterpolator.Result r = FuelNormInterpolator.interpolate(grid(), VEHICLE, d("4"), d("200")).orElseThrow();

        assertThat(r.slopeLow()).isEqualByComparingTo("200");
        assertThat(r.slopeHigh()).isEqualByComparingTo("200");
        assertThat(r.nb()).isEqualByComparingTo("10");
    }

    @Test
    @DisplayName("cung độ trùng đúng mốc (Hb = Ha) → Nt = Nb")
    void distanceOnBreakpoint() {
        FuelNormInterpolator.Result r = FuelNormInterpolator.interpolate(grid(), VEHICLE, d("4"), d("210")).orElseThrow();

        assertThat(r.distanceLow()).isEqualByComparingTo("4");
        assertThat(r.distanceHigh()).isEqualByComparingTo("4");
        assertThat(r.value()).isEqualByComparingTo(r.nb());
    }

    @Test
    @DisplayName("cung độ toàn tuyến = 0 → Nt = 0, các bước trung gian để trống")
    void zeroDistance() {
        FuelNormInterpolator.Result r = FuelNormInterpolator.interpolate(grid(), VEHICLE, BigDecimal.ZERO, d("210")).orElseThrow();

        assertThat(r.value()).isEqualByComparingTo("0");
        assertThat(r.distanceLow()).isNull();
        assertThat(r.nb()).isNull();
        assertThat(r.na()).isNull();
    }

    @Test
    @DisplayName("chủng loại xe chưa có cột trong lưới → không tra được (Optional rỗng), không âm thầm bằng 0")
    void unknownVehicle() {
        assertThat(FuelNormInterpolator.interpolate(grid(), "KHONG.CO", d("4.2"), d("210"))).isEmpty();
    }
}
