package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cột P "Chênh cao thanh toán nhiên liệu" của bảng tính (đối soát tháng 9/2026): engine từng nội suy
 * ĐMNL theo nâng tải thô nên 18 chuyến đã duyệt có dốc cục bộ lệch nhiên liệu −2,69%.
 */
class FuelPaymentLiftTest {

    private static TransportReportTrip trip(Double distance, Double lift, Double slopeDistance, Double slopeM) {
        TransportReportTrip t = new TransportReportTrip();
        t.setTotalRouteDistanceKm(distance);
        t.setTotalRouteLiftM(lift);
        t.setLocalSlopeDistanceKm(slopeDistance);
        t.setLocalSlopeM(slopeM);
        return t;
    }

    private static void assertLift(TransportReportTrip trip, String expected) {
        assertThat(FuelCalculator.fuelPaymentLift(trip)).isEqualByComparingTo(new BigDecimal(expected));
    }

    @Test
    @DisplayName("Cung độ 0 -> 0, dù nâng tải có giá trị")
    void zeroDistanceGivesZero() {
        assertLift(trip(0.0, 40.0, null, null), "0");
    }

    @Test
    @DisplayName("Không khai dốc cục bộ (O=0 < M): giữ nguyên nâng tải như Excel (IF(O<M,M,...)), nâng tải âm kẹp về 0")
    void noLocalSlopeKeepsPositiveLiftAndClampsNegative() {
        assertLift(trip(3.75, 36.5, null, null), "36.5");
        assertLift(trip(3.75, -5.0, 0.0, 0.0), "0");
    }

    @Test
    @DisplayName("O >= M nhưng cung độ dốc cục bộ = 0: làm tròn nâng tải (nửa làm tròn lên)")
    void slopeAtOrAboveLiftWithoutSlopeDistanceRounds() {
        assertLift(trip(3.0, 36.5, 0.0, 40.0), "37");
    }

    @Test
    @DisplayName("Dốc cục bộ thấp hơn nâng tải (O < M): giữ nguyên nâng tải, không làm tròn")
    void localSlopeBelowLiftKeepsLift() {
        assertLift(trip(4.0, 40.0, 1.0, 30.0), "40");
    }

    @Test
    @DisplayName("Có dốc cục bộ: P = ROUND(max(M,0) + (O - max(M,0)) * N / L)")
    void localSlopeAddsProportionalLift() {
        // 10 + (30 - 10) * 1 / 4 = 15
        assertLift(trip(4.0, 10.0, 1.0, 30.0), "15");
        // nâng tải âm: cơ sở 0 -> 0 + (24 - 0) * 2 / 4 = 12
        assertLift(trip(4.0, -3.0, 2.0, 24.0), "12");
    }

    @Test
    @DisplayName("Trường chưa khai (null) coi là 0")
    void nullFieldsAreZero() {
        assertLift(trip(2.0, null, null, null), "0");
    }
}
