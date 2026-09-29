package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CoefficientItemRequest {

    @NotBlank(message = "Mã hệ số là bắt buộc")
    String code;

    @NotBlank(message = "Tên hệ số là bắt buộc")
    String name;

    @NotNull(message = "Giá trị hệ số là bắt buộc")
    java.math.BigDecimal value;

    String note;
}
