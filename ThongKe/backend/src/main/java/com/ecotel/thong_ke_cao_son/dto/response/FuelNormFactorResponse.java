package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FuelNormFactorResponse {
    Long id;
    /** Cột "Thời gian": {@code MM/yyyy - MM/yyyy}. */
    String period;
    /** Loại BSNL (chữ hiện trên giao diện), chỉ có ở nhóm BSNL. */
    String bsnlType;
    /** Dạng điều kiện HS Than, chỉ có ở nhóm HS Than (CN-NK). */
    String coalCondition;
    Long vehicleRankId;
    String vehicleRankName;
    String vehicleType;
    String vehicleCode;
    String cargo;
    String areaGroup;
    BigDecimal maxDistanceKm;
    Integer priority;
    Integer roundDigits;
    BigDecimal factor;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
