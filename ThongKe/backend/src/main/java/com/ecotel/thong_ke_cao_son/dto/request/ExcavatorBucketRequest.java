package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExcavatorBucketRequest {

    @NotBlank(message = "Mã gầu xúc là bắt buộc")
    String code;

    @NotBlank(message = "Tên gầu xúc là bắt buộc")
    String name;

    /** Dung tích gầu (m³). */
    BigDecimal capacity;

    String note;
}
