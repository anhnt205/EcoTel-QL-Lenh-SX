package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModelPeriodRequest {

    @NotNull(message = "Chủng loại hàng là bắt buộc")
    Long cargoTypeId;

    @NotNull(message = "Từ ngày là bắt buộc")
    LocalDate effectiveFrom;

    @NotNull(message = "Đến ngày là bắt buộc")
    LocalDate effectiveTo;

    String note;

    /** Khoá {@code <mã chủng loại xe>.<CS|KC>} → giá trị (m3/chuyến). */
    @NotEmpty(message = "Chưa nhập giá trị cho chủng loại xe nào")
    Map<String, BigDecimal> values;
}
