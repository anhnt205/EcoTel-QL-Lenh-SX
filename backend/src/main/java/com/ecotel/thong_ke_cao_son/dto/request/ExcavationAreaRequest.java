package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExcavationAreaRequest {

    @NotBlank(message = "Mã khu vực xúc là bắt buộc")
    String code;

    @NotBlank(message = "Tên khu vực xúc là bắt buộc")
    String name;

    String note;
}
