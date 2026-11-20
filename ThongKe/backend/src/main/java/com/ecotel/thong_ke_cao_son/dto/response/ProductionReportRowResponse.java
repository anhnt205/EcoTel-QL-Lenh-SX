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
    // Các thành phần của khoá "Nhóm vỉa + Máy xúc" (Máy xúc và Khu vực xúc đã có ở nhóm 1;
    // Hậu tố do người dùng gửi điều kiện sau nên chưa có cột riêng).
    String seamGroupName;
    String benchGroup;
    String mudMark;
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


    // ── Nhóm 6: vết tính toán ───────────────────────────────────────────────
    BigDecimal densityUsed;
    BigDecimal modelUsed;
    BigDecimal bulkDensityUsed;
    BigDecimal hsM3;
    BigDecimal hsTon;
    BigDecimal hsTkm;

    // ── Nhóm TKE ban đầu / không quy ẩm ─────────────────────────────────────
    BigDecimal densityOriginal;
    BigDecimal densityNoMoisture;
    BigDecimal totalM3Original;
    BigDecimal totalTonNoMoisture;
    BigDecimal totalTkmNoMoisture;

    // ── Đá thải và các cột dẫn xuất ─────────────────────────────────────────
    /** Đá thải (tấn) = giá trị tự nhập (Báo chuyến) × Tổng KLVC TKE ban đầu chưa trừ đá — chỉ nhóm THANV. */
    BigDecimal wasteRockTon;
    /** Đá thải (m3) = Đá thải (tấn) ÷ 2,625 (KC) / 2,617 (CS). */
    BigDecimal wasteRockM3;
    /** Tổng KLVC TKE (tấn) ban đầu chưa trừ đá (CK). */
    BigDecimal totalTonOriginalBeforeWaste;
    /** Tổng km vận chuyển = Cung độ toàn tuyến × Số chuyến. */
    BigDecimal totalKmTransport;

    // ── Mã hoá hàng ─────────────────────────────────────────────────────────
    String cargoCode;
    String cargoTtlCode;
    String seamKpmb;

    // ── Trường nhập tay trên Báo chuyến, chuyển thẳng sang bảng thống kê ─────
    Integer receivingFloor;
    String unloadingFloor;
    BigDecimal routeLiftM;
    BigDecimal localSlopeDistanceKm;
    BigDecimal weighedWeightTon;
    BigDecimal provisionalModel;
    BigDecimal provisionalDensity;
    BigDecimal deductionAmount;
    /** HS áp cho than CTNB: Hệ số chênh lệch _CTNB (Báo chuyến) = 0/trống → 1, khác 0 → chính hệ số đó. */
    BigDecimal ctnbFactor;
    /** HSTĐ m3/tấn/tkm lấy từ báo cáo Áp Trắc địa của tháng (số trắc địa ÷ tổng của khoá, khối Đất CN/Đất SX/Than SX của chuyến). */
    BigDecimal apHsM3;
    BigDecimal apHsTon;
    BigDecimal apHsTkm;
    /** Chênh cao thanh toán nhiên liệu — tính từ cung độ, nâng tải, dốc cục bộ của chuyến (FuelCalculator.fuelPaymentLift). */
    BigDecimal fuelPaymentLift;
    /** Ngày mưa / Xe bổ túc: tick ở Báo chuyến. */
    boolean rainyDay;
    boolean supplementaryVehicle;
    /** Mức tải của chuyến (cột "Tải trọng"): Đủ tải / Roda (2/3) / x/y. */
    String loadLevel;
    /** SPNT/CN — Sản phẩm nghiệm thu của chủng loại hàng của chuyến (theo danh mục Chủng loại hàng). */
    String cargoSpntCn;

    // ── Thuộc tính thiết bị của chuyến (lấy từ danh mục Xe / Máy) ──────────
    String vehicleNumber;
    String vehicleCarRenovation;
    String vehicleTypeName;
    String vehicleCategoryClassName;
    String vehicleRankName;
    String vehicleRankGroupName;
    String vehicleDepartmentName;
    String vehicleFuelClassName;
    /** Chủng loại xe + Nhóm hạng xe = Chủng loại xe _ Nhóm hạng xe (vd HM400-2R_C). */
    String vehicleTypeRankGroupKey;
    /** Chủng loại xe + ĐMNL = Chủng loại xe + hậu tố (.Bun / .Dat / .BK / .DAT|.Than) theo chủng loại hàng, nơi dỡ tải, SPNT, phân loại. */
    String vehicleFuelNormKey;
    String excavatorNumber;
    String excavatorTypeName;
    String excavatorRankName;
    String excavatorBucketName;
    String excavatorDepartmentName;

    // ── Nội suy định mức nhiên liệu: các bước trung gian ────────────────────
    BigDecimal fuelHb;
    BigDecimal fuelHa;
    BigDecimal fuelH1;
    BigDecimal fuelH2;
    BigDecimal fuelNbH1;
    BigDecimal fuelNbH2;
    BigDecimal fuelNb;
    BigDecimal fuelNaH1;
    BigDecimal fuelNaH2;
    BigDecimal fuelNa;
    BigDecimal fuelNt;
    /** ĐMNL theo mùa; cột "ĐMNL (công ty)" = ĐMNL theo mùa nên dùng chung giá trị. */
    BigDecimal fuelNormSeasonal;
    BigDecimal fuelNormVehicleClass;
    BigDecimal fuelNormCarRenovation;
    BigDecimal fuelCoalCnNkFactor;
    // Bảy khoản BSNL có công thức (BSNL (SPNT/CN) chưa có công thức nên không có cột dữ liệu)
    BigDecimal bsnlRoda;
    BigDecimal bsnlRainyDay;
    BigDecimal bsnlSupplementary;
    BigDecimal bsnlMaintenance;
    BigDecimal bsnlOther;
    BigDecimal bsnlSpnt;
    BigDecimal bsnlMud;

    // ── Nhóm 7: nhiên liệu và năng suất ─────────────────────────────────────
    BigDecimal fuelNorm;
    BigDecimal fuelBaseConsumption;
    BigDecimal fuelTotalBeforeAdjustment;
    BigDecimal fuelCurrentNorm;
    BigDecimal productivityNorm;
}
