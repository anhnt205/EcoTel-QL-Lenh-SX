package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class TransportReportSearchRequest {

    @NotNull(message = "Từ ngày là bắt buộc")
    private LocalDate fromDate;

    @NotNull(message = "Đến ngày là bắt buộc")
    private LocalDate toDate;

    private List<Long> shiftIds;
    private List<Long> deviceIds;
}
