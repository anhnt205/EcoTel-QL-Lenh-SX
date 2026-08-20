package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TripBulkUpdateItem {
    @NotNull(message = "ID chuyến là bắt buộc")
    private Long id;

    @Valid
    @NotNull(message = "Dữ liệu cập nhật là bắt buộc")
    private TransportReportTripRequest data;
}
