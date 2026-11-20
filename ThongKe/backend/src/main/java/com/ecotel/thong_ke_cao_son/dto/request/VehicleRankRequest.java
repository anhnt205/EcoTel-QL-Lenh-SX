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
public class VehicleRankRequest {

    @NotBlank(message = "Mã hạng xe là bắt buộc")
    String code;

    /** Không còn nhập (2026-11-15); để trống = 0. */
    Integer rank;

    @NotNull(message = "Nhóm hạng xe là bắt buộc")
    Long vehicleRankGroupId;

    String note;
}
