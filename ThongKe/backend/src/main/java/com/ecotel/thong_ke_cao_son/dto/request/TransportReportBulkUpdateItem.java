package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransportReportBulkUpdateItem {

    @NotNull(message = "ID báo cáo là bắt buộc")
    private Long id;

    @Valid
    @NotNull(message = "Dữ liệu cập nhật là bắt buộc")
    private TransportReportRequest data;
}
