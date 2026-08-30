package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReceivingPointRequest {

    @NotBlank(message = "Mã nơi nhận tải là bắt buộc")
    String code;

    @NotBlank(message = "Tên nơi nhận tải là bắt buộc")
    String name;

    /** Nhóm vỉa — chọn từ combobox, có thể để trống. */
    String seamGroup;

    String note;
}
