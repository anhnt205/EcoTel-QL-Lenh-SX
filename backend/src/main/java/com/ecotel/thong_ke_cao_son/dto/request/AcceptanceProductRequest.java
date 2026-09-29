package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AcceptanceProductRequest {

    @NotBlank(message = "Mã sản phẩm nghiệm thu là bắt buộc")
    String code;

    @NotBlank(message = "Tên sản phẩm nghiệm thu là bắt buộc")
    String name;

    String note;
}
