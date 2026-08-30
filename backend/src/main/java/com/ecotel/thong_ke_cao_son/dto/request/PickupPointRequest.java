package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PickupPointRequest {

    @NotBlank(message = "Mã nơi chất tải là bắt buộc")
    String code;

    @NotBlank(message = "Tên nơi chất tải là bắt buộc")
    String name;

    String note;
}
