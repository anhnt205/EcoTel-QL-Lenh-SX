package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TransportReportTripResponse {
    private Long id;

    private Long excavationAreaId;
    private String excavationAreaName;

    private Long excavatorDeviceId;
    private String excavatorDeviceName;

    private Long loadingPointId;
    private String loadingPointName;

    private Integer receivingFloor;
    private Integer receivingFloorGroup;
    private String unloadingFloor;

    private Double totalRouteDistanceKm;
    private Double totalRouteLiftM;
    private Double localSlopeDistanceKm;
    private Double localSlopeM;

    private Long unloadingPointId;
    private String unloadingPointName;

    private Long cargoTypeId;
    private String cargoTypeName;

    private Long cargoGroupId;
    private String cargoGroupName;

    private Integer tripCount;

    private LoadLevelType loadLevelType;
    private String loadLevelCustomValue;
}
