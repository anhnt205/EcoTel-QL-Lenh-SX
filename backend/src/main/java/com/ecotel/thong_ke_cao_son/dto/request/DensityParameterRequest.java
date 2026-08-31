package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DensityParameterRequest {

    @NotNull(message = "Chủng loại hàng là bắt buộc")
    Long cargoTypeId;

    /** Để trống = áp cho MỌI khu vực xúc. */
    Long excavationAreaId;

    @NotNull(message = "Từ ngày là bắt buộc")
    LocalDate effectiveFrom;

    @NotNull(message = "Đến ngày là bắt buộc")
    LocalDate effectiveTo;

    @NotNull(message = "Tỷ trọng (quy ẩm) là bắt buộc")
    BigDecimal densityWet;

    @NotNull(message = "Tỷ trọng (không quy ẩm) là bắt buộc")
    BigDecimal densityDry;

    String note;
}
