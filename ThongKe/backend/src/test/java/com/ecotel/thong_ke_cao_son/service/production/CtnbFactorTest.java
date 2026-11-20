package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Cột "HS áp cho than CTNB": Hệ số chênh lệch _CTNB (Báo chuyến) = 0/trống → 1; khác 0 → chính hệ số đó. */
class CtnbFactorTest {

    private static TransportReportTrip tripWith(BigDecimal coefficient) {
        TransportReportTrip t = new TransportReportTrip();
        t.setCtnbDeviationCoefficient(coefficient);
        return t;
    }

    @Test
    @DisplayName("hệ số chênh lệch = 0 → HS áp = 1")
    void zeroBecomesOne() {
        assertThat(ProductionCalculationService.ctnbFactor(tripWith(BigDecimal.ZERO))).isEqualByComparingTo("1");
    }

    @Test
    @DisplayName("hệ số chênh lệch để trống → HS áp = 1")
    void nullBecomesOne() {
        assertThat(ProductionCalculationService.ctnbFactor(tripWith(null))).isEqualByComparingTo("1");
    }

    @Test
    @DisplayName("hệ số chênh lệch ≠ 0 → HS áp = đúng hệ số đó")
    void nonZeroIsKept() {
        assertThat(ProductionCalculationService.ctnbFactor(tripWith(new BigDecimal("0.95")))).isEqualByComparingTo("0.95");
    }
}
