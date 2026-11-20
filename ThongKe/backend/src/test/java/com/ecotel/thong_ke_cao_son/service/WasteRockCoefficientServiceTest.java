package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.WasteRockCoefficientRequest;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.repository.ExcavationAreaRepository;
import com.ecotel.thong_ke_cao_son.repository.WasteRockCoefficientRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Danh mục Hệ số đá thải: mỗi dòng = Thời gian (tháng/năm - tháng/năm) + Khu vực xúc + hệ số; cùng khu vực không chồng lấn thời gian. */
@ExtendWith(MockitoExtension.class)
class WasteRockCoefficientServiceTest {

    @Mock private WasteRockCoefficientRepository repository;
    @Mock private ExcavationAreaRepository excavationAreaRepository;

    private static WasteRockCoefficientRequest request(long areaId, String period, String coefficient) {
        WasteRockCoefficientRequest r = new WasteRockCoefficientRequest();
        r.setExcavationAreaId(areaId);
        r.setPeriod(period);
        r.setCoefficient(new BigDecimal(coefficient));
        return r;
    }

    @Test
    @DisplayName("khu vực chưa có dòng nào chứa tháng đó → trống (không tự lấy số khác)")
    void noRowMeansEmpty() {
        org.mockito.Mockito.when(repository.findFirstCovering(5L, java.time.LocalDate.of(2026, 9, 1))).thenReturn(Optional.empty());

        assertThat(new WasteRockCoefficientService(repository, excavationAreaRepository)
                .coefficientFor(5L, YearMonth.of(2026, 9))).isEmpty();
        assertThat(new WasteRockCoefficientService(repository, excavationAreaRepository)
                .coefficientFor(null, YearMonth.of(2026, 9))).isEmpty();
    }

    @Test
    @DisplayName("cùng khu vực xúc, hai dòng chồng lấn thời gian trong một lần thêm → bị từ chối")
    void sameAreaOverlapRejected() {
        var a = request(5L, "09/2026 - 11/2026", "2.625");
        var b = request(5L, "11/2026 - 12/2026", "2.617");

        assertThatThrownBy(() -> new WasteRockCoefficientService(repository, excavationAreaRepository).bulkCreate(List.of(a, b)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("chồng lấn");
    }

    @Test
    @DisplayName("hệ số đá thải ≤ 0 → từ chối (dùng làm số chia)")
    void nonPositiveRejected() {
        var r = request(5L, "09/2026 - 09/2026", "0");

        assertThatThrownBy(() -> new WasteRockCoefficientService(repository, excavationAreaRepository).create(r))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("lớn hơn 0");
    }
}
