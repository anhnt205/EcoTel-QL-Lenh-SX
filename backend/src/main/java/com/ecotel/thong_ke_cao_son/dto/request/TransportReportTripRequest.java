package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransportReportTripRequest {

    @NotNull(message = "Khu vực xúc là bắt buộc")
    private Long excavationAreaId;

    @NotNull(message = "Máy xúc là bắt buộc")
    private Long excavatorDeviceId;

    @NotNull(message = "Nơi nhận tải là bắt buộc")
    private Long loadingPointId;

    private Integer receivingFloor;
    private String unloadingFloor;

    private Double totalRouteDistanceKm;
    private Double totalRouteLiftM;
    private Double localSlopeDistanceKm;
    private Double localSlopeM;

    @NotNull(message = "Nơi dỡ tải là bắt buộc")
    private Long unloadingPointId;

    @NotNull(message = "Loại hàng là bắt buộc")
    private Long cargoTypeId;

    private Integer tripCount;

    @NotNull(message = "Mức tải là bắt buộc")
    private LoadLevelType loadLevelType; // FULL_LOAD, RODA_2_3, OTHER

    @Pattern(regexp = "^\\d+/\\d+$", message = "Giá trị mức tải phải dạng x/y, ví dụ 1/2")
    private String loadLevelCustomValue; // chỉ bắt buộc khi loadLevelType = OTHER
}
