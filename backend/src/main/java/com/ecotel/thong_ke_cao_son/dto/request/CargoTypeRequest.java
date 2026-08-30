package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/** Chủng loại hàng — theo QĐ-09 (đã hợp nhất phần của Material vào đây). */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CargoTypeRequest {

    @NotBlank(message = "Mã chủng loại hàng là bắt buộc")
    String code;

    @NotBlank(message = "Tên chủng loại hàng là bắt buộc")
    String name;

    @NotNull(message = "Nhóm chủng loại hàng là bắt buộc")
    Long cargoGroupId;

    String acceptanceProduct;

    String ttlClh;

    /** Ghi chú. */
    String description;
}
