package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
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

    private Long employeeId;
    private String employeeSalaryCode;
    private String employeeFullName;
    private String employeeDepartmentName;

    private Long departmentId;
    private String departmentName;

    private Long vehicleId;
    private String vehicleCode;
    private String vehicleName;
    private String vehicleDepartmentName;
    private String vehicleCategoryName;

    private Double fuelBeginning;
    private Double fuelEnding;
    private Double fuelReceived;
    private Double fuelUsed;

    private ApprovalStatus status;
    private String note;

    private List<TransportReportTripResponse> trips;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
