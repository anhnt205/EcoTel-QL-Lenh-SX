package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class TransportReportRequest {

    @NotNull(message = "Thời gian là bắt buộc")
    private LocalDate reportDate;

    @NotNull(message = "Ca là bắt buộc")
    private Long shiftId;

    @NotNull(message = "Nhân viên là bắt buộc")
    private Long employeeId;

    private Double fuelBeginning;
    private Double fuelEnding;
    private Double fuelReceived;

    @Valid
    @NotNull(message = "Cần ít nhất 1 chuyến")
    private List<TransportReportTripRequest> trips;
}
