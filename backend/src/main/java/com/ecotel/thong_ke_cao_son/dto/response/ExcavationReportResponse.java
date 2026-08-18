package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ExcavationReportResponse {
    private Long id;
    private LocalDate reportDate;

    private Long shiftId;
    private Integer shiftName;

    private Long excavatorDeviceId;
    private String excavatorDeviceCode;
    private String excavatorDeviceName;

    private Long vehicleId;
    private String vehicleCode;
    private String vehicleName;
    private String vehicleDepartmentName;
    private String vehicleCategoryName;

    private String excavationFloor;

    private Long receivingLocationId;
    private String receivingLocationName;

    private Double fuelBeginning;
    private Double fuelEnding;
    private Double fuelReceived;
    private Double fuelUsed;

    private Long employeeId;
    private String employeeSalaryCode;
    private String employeeFullName;
    private String employeeDepartmentName;

    private Long departmentId;
    private String departmentName;

    private List<ExcavationReportTripResponse> trips;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
