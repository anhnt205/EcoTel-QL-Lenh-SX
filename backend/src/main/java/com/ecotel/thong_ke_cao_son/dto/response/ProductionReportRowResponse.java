package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Một dòng của màn "Báo cáo thống kê" — tương ứng một dòng sheet
 * {@code tinh toan}: một chuyến đã đối soát.
 *
 * <p>Sheet gốc có 206 cột, phần lớn là bước đệm của Excel. Ở đây trả về
 * <b>ngữ cảnh chuyến</b> (để người đọc biết dòng này là của ai, ngày nào) và
 * <b>các chỉ tiêu đầu ra</b> của ba lượt tính, kèm <b>vết tính toán</b> để
 * truy được vì sao ra con số đó.
 *
 * <p>Trả DTO chứ không trả thẳng {@code ProductionResult}: entity chỉ có khoá
 * ngoại, đọc ra ngoài giao dịch sẽ vướng lazy-loading, và người đọc báo cáo
 * cần TÊN chứ không cần id.
 */
@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductionReportRowResponse {

    Long id;
    Long transportTripId;

    // ── Nhóm 1: thông tin chuyến ────────────────────────────────────────────
    LocalDate productionDate;
    String shiftName;
    String vehicleCode;
    String excavatorCode;
    String excavationAreaName;
    String loadingPointName;
    String unloadingPointName;
    String cargoTypeName;
    String cargoGroupName;
    Integer tripCount;
    BigDecimal routeDistanceKm;

    // ── Nhóm 2: khoá gộp ────────────────────────────────────────────────────
    String seamGroupExcavatorKey;
    String acceptanceProduct;

    // ── Nhóm 3: Thống kê (lượt 1, chưa áp hệ số trắc địa) ───────────────────
    BigDecimal totalM3;
    BigDecimal totalTon;
    BigDecimal totalTkm;

    // ── Nhóm 4: Trắc địa (lượt 2) ───────────────────────────────────────────
    BigDecimal surveyM3;
    BigDecimal surveyTon;
    BigDecimal surveyTkm;

    // ── Nhóm 5: Kết quả cuối (lượt 3) ───────────────────────────────────────
    BigDecimal finalTon;
    BigDecimal finalTkm;

    // ── Nhóm 6: vết tính toán ───────────────────────────────────────────────
    BigDecimal densityUsed;
    BigDecimal modelUsed;
    BigDecimal bulkDensityUsed;
    BigDecimal hsM3;
    BigDecimal hsTon;
    BigDecimal hsTkm;
    boolean tkeMode;
}
