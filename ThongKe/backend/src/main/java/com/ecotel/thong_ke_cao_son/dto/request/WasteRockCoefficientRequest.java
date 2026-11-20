package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WasteRockCoefficientRequest {

    /** Cột "Thời gian": {@code MM/yyyy - MM/yyyy}, vd {@code 09/2026 - 12/2026}. */
    @NotBlank(message = "Thời gian là bắt buộc")
    String period;

    @NotNull(message = "Khu vực xúc là bắt buộc")
    Long excavationAreaId;

    @NotNull(message = "Hệ số đá thải là bắt buộc")
    BigDecimal coefficient;

    String note;
}
