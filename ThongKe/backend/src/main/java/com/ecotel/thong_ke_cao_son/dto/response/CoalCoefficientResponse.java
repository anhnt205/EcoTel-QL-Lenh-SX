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
public class CoalCoefficientResponse {
    Long id;
    /** Cột "Thời gian": {@code MM/yyyy - MM/yyyy}, vd {@code 09/2026 - 12/2026}. */
    String period;
    BigDecimal thanTkeTruDa;
    BigDecimal kcs;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
