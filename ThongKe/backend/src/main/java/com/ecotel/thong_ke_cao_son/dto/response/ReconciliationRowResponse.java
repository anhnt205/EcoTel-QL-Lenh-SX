package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationRowStatus;
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

    // Trạng thái THẬT của từng bên (null nếu bên đó không tồn tại) — dùng để
    // biết chính xác bên nào đang bị yêu cầu sửa, KHÔNG suy từ decision.status
    // (1 decision chỉ có 1 status chung cho cả 2 bên).
    private ApprovalStatus transportStatus;
    private ApprovalStatus excavationStatus;

    // Trạng thái TÍNH TOÁN của cả dòng — quyết định màu bôi (đỏ/vàng/trắng).
    private ReconciliationRowStatus status;

    // Có lịch sử để xem qua icon "i" hay không (batch tính 1 lần/trang, không N+1).
    private Boolean transportHistoryAvailable;
    private Boolean excavationHistoryAvailable;

    /**
     * true = dòng này có NHIỀU HƠN 1 ứng viên ghép cặp cùng khoá (Thời gian/
     * Ca/Máy xúc/Số xe) ở CẢ hai phía, và KHÔNG ứng viên nào khớp đúng đủ 4
     * trường so sánh ({@code isMatched}) để phân biệt — hệ thống vẫn phải
     * ghép 1 cặp (không thể để trống dòng) nhưng không có tín hiệu nghiệp vụ
     * nào đảm bảo đúng ứng viên. Thêm theo Quality Gate lượt 3 của Codex
     * (2026-09-10) — xem javadoc {@code ReconciliationService.pickBestMatch}.
     */
    private Boolean pairingAmbiguous;

}
