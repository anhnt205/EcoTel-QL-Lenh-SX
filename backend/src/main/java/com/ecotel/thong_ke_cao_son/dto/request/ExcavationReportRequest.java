package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class ExcavationReportRequest {

    @NotNull(message = "Thời gian là bắt buộc")
    private LocalDate reportDate;

    @NotNull(message = "Ca là bắt buộc")
    private Long shiftId;

    @NotNull(message = "Máy xúc là bắt buộc")
    private Long excavatorDeviceId;

    @NotNull(message = "Số xe là bắt buộc")
    private Long vehicleId;

    private String excavationFloor;

    @NotNull(message = "Nơi nhận tải là bắt buộc")
    private Long receivingLocationId;

    private Double fuelBeginning;
    private Double fuelEnding;
    private Double fuelReceived;

    @NotNull(message = "Số thẻ lương là bắt buộc")
    private Long employeeId;

    @Valid
    @NotNull(message = "Cần ít nhất 1 chuyến")
    private List<ExcavationReportTripRequest> trips;
}
