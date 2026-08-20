package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ExcavationReportTripResponse {
    private Long id;

    private ApprovalStatus status;
    private String note;

    private Long vehicleId;
    private String vehicleCode;
    private String vehicleName;
    private String vehicleDepartmentName;
    private String vehicleCategoryName;

    private Integer tripCount;

    private Long cargoTypeId;
    private String cargoTypeName;

    private Long cargoGroupId;
    private String cargoGroupName;

    private LoadLevelType loadLevelType;
    private String loadLevelCustomValue;
}
