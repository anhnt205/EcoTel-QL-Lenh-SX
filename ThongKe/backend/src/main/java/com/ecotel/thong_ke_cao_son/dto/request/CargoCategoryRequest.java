package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CargoCategoryRequest {

    @NotBlank(message = "Mã loại hàng là bắt buộc")
    String code;

    @NotBlank(message = "Loại hàng là bắt buộc")
    String name;

    String note;
}
