package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * "Nhóm tầng nhận tải" theo logic chủ dự án chốt 2026-11-16:
 * <ul>
 *   <li>Khu vực xúc là KC: tầng &lt; -195 → -200; tầng &lt; 0 → (-1 + TRUNC((tầng+1)/15)) × 15; tầng ≥ 0 → TRUNC(tầng/15) × 15.</li>
 *   <li>Khu vực xúc khác KC: bỏ nhánh -200, hai nhánh còn lại như trên.</li>
 * </ul>
 */
class ReceivingFloorGroupCalculatorTest {

    private final ReceivingFloorGroupCalculator calc = new ReceivingFloorGroupCalculator();

    private static ExcavationArea area(String group) {
        ExcavationArea a = new ExcavationArea();
        a.setCode("X");
        a.setAreaGroup(group);
        return a;
    }

    @Test
    @DisplayName("KC: tầng < -195 → -200 (không nhân 15)")
    void kcBelowMinus195() {
        assertThat(calc.calculate(area("KC"), -196)).isEqualTo(-200);
        assertThat(calc.calculate(area("KC"), -300)).isEqualTo(-200);
    }

    @Test
    @DisplayName("KC: tầng = -195 đi nhánh âm thường")
    void kcAtMinus195() {
        assertThat(calc.calculate(area("KC"), -195)).isEqualTo((-1 + (-194) / 15) * 15);
    }

    @Test
    @DisplayName("tầng âm: (-1 + TRUNC((tầng+1)/15)) × 15")
    void negativeFloor() {
        assertThat(calc.calculate(area("KC"), -1)).isEqualTo(-15);
        assertThat(calc.calculate(area("KC"), -14)).isEqualTo(-15);
        assertThat(calc.calculate(area("KC"), -15)).isEqualTo(-15);
        assertThat(calc.calculate(area("KC"), -16)).isEqualTo(-30);
    }

    @Test
    @DisplayName("tầng ≥ 0: TRUNC(tầng/15) × 15")
    void nonNegativeFloor() {
        assertThat(calc.calculate(area("KC"), 0)).isEqualTo(0);
        assertThat(calc.calculate(area("KC"), 14)).isEqualTo(0);
        assertThat(calc.calculate(area("KC"), 15)).isEqualTo(15);
        assertThat(calc.calculate(area("KC"), 44)).isEqualTo(30);
    }

    @Test
    @DisplayName("khu vực KHÁC KC (CS): không có nhánh -200, tầng rất sâu vẫn theo công thức âm")
    void nonKcHasNoMinus200Branch() {
        assertThat(calc.calculate(area("CS"), -300)).isEqualTo((-1 + (-299) / 15) * 15);
        assertThat(calc.calculate(area("CS"), -16)).isEqualTo(-30);
        assertThat(calc.calculate(area("CS"), 44)).isEqualTo(30);
    }

    @Test
    @DisplayName("chưa nhập tầng → null")
    void nullFloor() {
        assertThat(calc.calculate(area("KC"), null)).isNull();
    }
}
