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
public class MatrixAxisEntryRequest {

    @NotBlank(message = "Khoá là bắt buộc")
    String key;

    String label;

    /** Bắt buộc với trục số; hệ tự thử đọc từ `key` nếu để trống. */
    BigDecimal numericValue;

    Integer sortOrder;
}
