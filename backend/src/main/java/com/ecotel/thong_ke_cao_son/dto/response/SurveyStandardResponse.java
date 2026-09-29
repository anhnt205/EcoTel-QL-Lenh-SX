package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.model.SurveyStandard;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SurveyStandardResponse {

    Long id;
    SurveyStandard.CatalogType catalogType;
    String seamGroupExcavatorKey;

    /** Sáu thành phần đã ghép nên khoá — chỉ để Xem/Sửa hiện lại đúng, xem model. */
    String seamGroup;
    String benchGroup;
    String excavator;
    String mudMark;
    String excavationArea;
    String suffix;
    LocalDate effectiveFrom;
    LocalDate effectiveTo;

    String earthAcceptanceProduct;
    BigDecimal earthM3;
    BigDecimal earthDesignVolume;
    BigDecimal earthDeviation;
    BigDecimal earthTon;
    BigDecimal earthHaulDistance;
    BigDecimal earthBulkDensity;
    BigDecimal earthTkm;

    String coalAcceptanceProduct;
    BigDecimal coalM3;
    BigDecimal coalBulkDensity;
    BigDecimal coalTon;
    BigDecimal coalDesignVolume;
    BigDecimal coalDeviation;
    BigDecimal coalHaulDistance;
    BigDecimal coalTkm;

    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
