package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Bộ hệ số ĐMNL/BSNL: khoảng thời gian, khớp điều kiện dạng danh sách, mặc định khi chưa khai. */
class FuelNormFactorSetTest {

    private static FuelNormFactorSet.Rule season(String from, String to, String factor) {
        return new FuelNormFactorSet.Rule(null, FuelNormFactorKind.SEASON, null, LocalDate.parse(from), LocalDate.parse(to),
                null, null, null, null, null, null, 0, null, new BigDecimal(factor));
    }

    @Test
    @DisplayName("hệ số theo mùa: chỉ các tháng nằm trong khoảng (bao gồm hai đầu); tháng ngoài khoảng = 1")
    void seasonByMonthRange() {
        FuelNormFactorSet set = new FuelNormFactorSet(List.of(season("2026-06-01", "2026-09-01", "1.03")));

        assertThat(set.seasonFactor(YearMonth.of(2026, 5))).isEqualByComparingTo("1");
        assertThat(set.seasonFactor(YearMonth.of(2026, 6))).isEqualByComparingTo("1.03");
        assertThat(set.seasonFactor(YearMonth.of(2026, 9))).isEqualByComparingTo("1.03");
        assertThat(set.seasonFactor(YearMonth.of(2026, 10))).isEqualByComparingTo("1");
        assertThat(set.seasonFactor(YearMonth.of(2027, 7))).isEqualByComparingTo("1");
    }

    @Test
    @DisplayName("danh mục trống: ĐMNL = 1 và mọi nhóm đều bị báo là chưa khai")
    void emptySet() {
        FuelNormFactorSet set = FuelNormFactorSet.empty();

        assertThat(set.seasonFactor(YearMonth.of(2026, 9))).isEqualByComparingTo("1");
        assertThat(set.rankFactor(1L, YearMonth.of(2026, 9))).isEqualByComparingTo("1");
        assertThat(set.missingKinds()).containsExactlyInAnyOrder(FuelNormFactorKind.values());
    }

    @Test
    @DisplayName("điều kiện dạng danh sách: để trống = không xét; nhiều giá trị cách nhau bằng , hoặc ; ; dấu * = bắt đầu bằng; không phân biệt hoa thường")
    void listMatching() {
        assertThat(FuelNormFactorSet.matchesList(null, "CAT777")).isTrue();
        assertThat(FuelNormFactorSet.matchesList("  ", "CAT777")).isTrue();
        assertThat(FuelNormFactorSet.matchesList("cat777, HD785-7", "CAT777")).isTrue();
        assertThat(FuelNormFactorSet.matchesList("cat777; HD785-7", "hd785-7")).isTrue();
        assertThat(FuelNormFactorSet.matchesList("HD465*", "HD465-7R")).isTrue();
        assertThat(FuelNormFactorSet.matchesList("HD465-7R", "HD465-7")).isFalse();
        assertThat(FuelNormFactorSet.matchesList("965*", "96501")).isTrue();
        assertThat(FuelNormFactorSet.matchesList("965*", "906")).isFalse();
        // khớp một trong nhiều mã của chuyến (Chủng loại xe NL hoặc Chủng loại xe)
        assertThat(FuelNormFactorSet.matchesList("VOLVOA40-F", "VolvoA40F", "VOLVOA40-F")).isTrue();
        // chuyến thiếu mã mà dòng có điều kiện → không khớp
        assertThat(FuelNormFactorSet.matchesList("CAT777", (String) null)).isFalse();
    }
}
