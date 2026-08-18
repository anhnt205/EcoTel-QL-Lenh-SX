package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class ReconciliationRowResponse {

    private Long transportReportTripId;    // null nếu chuyến chỉ có ở Khai thác
    private Long excavationReportTripId; // null nếu chuyến chỉ có ở Vận tải

    // Thông tin chung — lấy từ TransportReportTrip; nếu không có (chỉ có ở Khai thác)
    // thì chỉ điền được 4 field khóa (reportDate, shiftName, vehicleCode, excavatorName)
    private LocalDate reportDate;
    private Integer shiftName;
    private String vehicleCode;
    private String excavationAreaName;
    private String excavatorName;
    private String loadingPointName;
    private String unloadingFloor;
    private Integer receivingFloor;
    private Double totalRouteDistanceKm;
    private Double totalRouteLiftM;
    private Double localSlopeDistanceKm;
    private Double localSlopeM;
    private String unloadingPointName;
    private Boolean rainyDay;
    private Boolean supplementaryVehicle;

    private ReconciliationTripDataResponse transportData;   // null nếu không có ở Vận tải
    private ReconciliationTripDataResponse excavationData;  // null nếu không có ở Khai thác

    private Boolean matched;

    private ReconciliationDecisionResponse decision;

}
