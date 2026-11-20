package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.CoalCoefficientRequest;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.model.CoalCoefficient;
import com.ecotel.thong_ke_cao_son.repository.CoalCoefficientRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Hệ số nhân tính tấn của than sản xuất = Hệ số KCS ÷ Hệ số Than TKE trừ đá của dòng có khoảng
 * thời gian chứa tháng sản xuất (bảng tính gốc: 190.993,45 ÷ 190.935,02 = 1,00031 — ô {@code $AM$3}).
 */
@ExtendWith(MockitoExtension.class)
class CoalCoefficientServiceTest {

    @Mock private CoalCoefficientRepository repository;

    private static CoalCoefficient row(String tke, String kcs) {
        CoalCoefficient c = new CoalCoefficient();
        c.setEffectiveFrom(LocalDate.of(2026, 9, 1));
        c.setEffectiveTo(LocalDate.of(2026, 12, 1));
        c.setThanTkeTruDa(new BigDecimal(tke));
        c.setKcs(new BigDecimal(kcs));
        return c;
    }

    private void stubLookup(Optional<CoalCoefficient> result) {
        when(repository.findFirstByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqualOrderByEffectiveFromDesc(
                any(), any())).thenReturn(result);
    }

    @Test
    @DisplayName("số liệu bảng tính: KCS ÷ TKE trừ đá ≈ 1,00031 (KCS ở TỬ, không phải mẫu)")
    void kcsOverTke() {
        stubLookup(Optional.of(row("190935.02", "190993.45")));

        BigDecimal m = new CoalCoefficientService(repository).tonMultiplier(YearMonth.of(2026, 10));

        // Bảng tính hiển thị đã làm tròn 1,00031; phép chia thật cho 1,000306.
        assertThat(m).isCloseTo(new BigDecimal("1.00031"), org.assertj.core.data.Offset.offset(new BigDecimal("0.00001")));
        assertThat(m).isGreaterThan(BigDecimal.ONE);
    }

    @Test
    @DisplayName("tháng không thuộc dòng nào → hệ số = 1 (giữ nguyên số tấn)")
    void missingMonthIsOne() {
        stubLookup(Optional.empty());

        assertThat(new CoalCoefficientService(repository).tonMultiplier(YearMonth.of(2027, 3)))
                .isEqualByComparingTo("1");
    }

    @Test
    @DisplayName("Hệ số Than TKE trừ đá = 0 → báo lỗi, không chia cho 0")
    void zeroTkeIsRejected() {
        stubLookup(Optional.of(row("0", "190993.45")));

        assertThatThrownBy(() -> new CoalCoefficientService(repository).tonMultiplier(YearMonth.of(2026, 9)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("bằng 0");
    }

    @Test
    @DisplayName("cột Thời gian một ô \"MM/yyyy - MM/yyyy\": đọc đúng hai tháng, chấp nhận 9/2026 và dấu gạch dài")
    void parsesPeriodColumn() {
        CoalCoefficientService.Period p = CoalCoefficientService.parsePeriod("09/2026 - 12/2026");
        assertThat(p.from()).isEqualTo(YearMonth.of(2026, 9));
        assertThat(p.to()).isEqualTo(YearMonth.of(2026, 12));

        assertThat(CoalCoefficientService.parsePeriod(" 9/2026 – 9/2026 ").from()).isEqualTo(YearMonth.of(2026, 9));
        assertThat(CoalCoefficientService.parsePeriod("12/2026 - 02/2027").to()).isEqualTo(YearMonth.of(2027, 2));
    }

    @Test
    @DisplayName("Thời gian sai dạng, tháng 13, hoặc tháng kết thúc trước tháng bắt đầu → báo lỗi")
    void rejectsBadPeriod() {
        assertThatThrownBy(() -> CoalCoefficientService.parsePeriod("09/2026")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> CoalCoefficientService.parsePeriod("13/2026 - 14/2026")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> CoalCoefficientService.parsePeriod("12/2026 - 09/2026"))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("trước");
        assertThatThrownBy(() -> CoalCoefficientService.parsePeriod(null)).isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("hai dòng chồng lấn thời gian trong cùng lần thêm → bị từ chối (một tháng không được có hai hệ số)")
    void bulkCreateRejectsOverlap() {
        CoalCoefficientRequest a = request("09/2026 - 11/2026");
        CoalCoefficientRequest b = request("11/2026 - 12/2026");

        assertThatThrownBy(() -> new CoalCoefficientService(repository).bulkCreate(List.of(a, b)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("chồng lấn");
    }

    private static CoalCoefficientRequest request(String period) {
        CoalCoefficientRequest r = new CoalCoefficientRequest();
        r.setPeriod(period);
        r.setThanTkeTruDa(new BigDecimal("1"));
        r.setKcs(new BigDecimal("1"));
        return r;
    }
}
