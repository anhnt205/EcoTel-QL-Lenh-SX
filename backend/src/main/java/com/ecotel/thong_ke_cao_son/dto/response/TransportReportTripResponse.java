package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class TransportReportTripResponse {
    private Long id;

    private ApprovalStatus status;
    private String note;

    /**
     * Ghi chú "yêu cầu chỉnh sửa" mà Thống kê gửi kèm ở màn Đối chiếu — để đơn
     * vị mở form sửa chuyến là đọc được ngay lý do, không phải quay lại màn Đối
     * chiếu tìm. Chỉ có giá trị khi chuyến đang {@code REVISION_REQUESTED};
     * các trạng thái khác để null. Không phải cột CSDL của chuyến — lấy từ
     * {@code reconciliation_decisions.note}. Chốt 2026-09-09.
     */
    private String revisionNote;

    private Boolean rainyDay;
    private Boolean supplementaryVehicle;

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

    // Sáu trường "(Báo chuyến)" phục vụ tính sản lượng (B5)
    private java.math.BigDecimal weighedWeightTon;
    private java.math.BigDecimal provisionalModel;
    private java.math.BigDecimal provisionalDensity;
    private java.math.BigDecimal ctnbDeviationCoefficient;
    private java.math.BigDecimal deductionAmount;
    private java.math.BigDecimal wasteRockTon;
}
