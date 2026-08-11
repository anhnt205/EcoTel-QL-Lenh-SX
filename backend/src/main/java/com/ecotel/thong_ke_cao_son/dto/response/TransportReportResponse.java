package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class TransportReportResponse {
    private Long id;
    private LocalDate reportDate;

    private Long shiftId;
    private Integer shiftName;

    private Long deviceId;
    private String deviceCode;
    private String deviceName;
    private String deviceDepartmentName; // "Đơn vị quản lý thiết bị"
    private String deviceCategoryName;   // "Chủng loại xe"

    private Long employeeId;
    private String employeeSalaryCode;   // "Số thẻ lương"
    private String employeeFullName;     // "Họ và tên"
    private String employeeDepartmentName; // "Đơn vị"

    private Boolean rainyDay;
    private Boolean supplementaryVehicle;

    private Double fuelBeginning;
    private Double fuelEnding;
    private Double fuelReceived;
    private Double fuelUsed;

    private List<TransportReportTripResponse> trips;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
