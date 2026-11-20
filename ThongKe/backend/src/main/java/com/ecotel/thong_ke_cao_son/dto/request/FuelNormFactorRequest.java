package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Một dòng của bốn danh mục hệ số ĐMNL và danh mục Hệ số BSNL. Cột nào không thuộc nhóm của danh mục đang dùng thì
 * bỏ qua (xem {@code FuelNormFactorService}).
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FuelNormFactorRequest {

    /** Cột "Thời gian": {@code MM/yyyy - MM/yyyy}, vd {@code 06/2026 - 09/2026}. */
    @NotBlank(message = "Thời gian là bắt buộc")
    String period;

    /** Loại BSNL — chữ hiện trên giao diện: Roda, Ngày mưa, Bổ túc, SC, BD, Khác, SPNT, Bùn (nhóm BSNL). */
    String bsnlType;

    /** Dạng điều kiện HS Than: "Chủng loại xe", "Khu vực + Hàng + Xe", "Cung độ + Xe" (nhóm HS Than CN-NK). */
    String coalCondition;

    /** Hạng xe/máy (nhóm theo hạng xe). */
    Long vehicleRankId;

    /** Chủng loại xe (HS Than, BSNL): nhiều giá trị cách nhau bằng dấu phẩy, kết thúc {@code *} = bắt đầu bằng. */
    String vehicleType;

    /** Số xe (BSNL). */
    String vehicleCode;

    /** Chủng loại hàng (HS Than, BSNL). */
    String cargo;

    /** Nhóm khu vực xúc CS / KC (HS Than). */
    String areaGroup;

    /** Cung độ toàn tuyến NHỎ HƠN (km) (HS Than). */
    BigDecimal maxDistanceKm;

    /** Thứ tự xét — số nhỏ xét trước (HS Than, BSNL). */
    Integer priority;

    /** Làm tròn kết quả BSNL tới n chữ số thập phân. */
    Integer roundDigits;

    @NotNull(message = "Hệ số là bắt buộc")
    BigDecimal factor;

    String note;
}
