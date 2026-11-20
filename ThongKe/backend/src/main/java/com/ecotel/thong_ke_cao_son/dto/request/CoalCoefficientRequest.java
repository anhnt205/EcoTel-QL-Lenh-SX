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
public class CoalCoefficientRequest {

    /** Cột "Thời gian": {@code MM/yyyy - MM/yyyy}, vd {@code 09/2026 - 12/2026} (từ tháng - đến tháng, bao gồm). */
    @NotBlank(message = "Thời gian là bắt buộc")
    String period;

    @NotNull(message = "Hệ số Than TKE trừ đá là bắt buộc")
    BigDecimal thanTkeTruDa;

    @NotNull(message = "Hệ số KCS là bắt buộc")
    BigDecimal kcs;

    String note;
}
