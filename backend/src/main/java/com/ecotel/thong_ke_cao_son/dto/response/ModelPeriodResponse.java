package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ModelPeriodResponse {

    Long id;

    Long cargoTypeId;
    String cargoTypeCode;
    String cargoTypeName;

    LocalDate effectiveFrom;
    LocalDate effectiveTo;
    String note;

    /** Khoá {@code <mã chủng loại xe>.<CS|KC>} → giá trị (m3/chuyến). */
    Map<String, BigDecimal> values;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
