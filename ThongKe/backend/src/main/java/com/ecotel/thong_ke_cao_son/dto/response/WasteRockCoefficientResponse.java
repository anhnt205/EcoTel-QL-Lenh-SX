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
public class WasteRockCoefficientResponse {
    Long id;
    /** Cột "Thời gian": {@code MM/yyyy - MM/yyyy}. */
    String period;
    Long excavationAreaId;
    String excavationAreaName;
    BigDecimal coefficient;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
