package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.model.SurveyStandard;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SurveyStandardRequest {

    @NotNull(message = "Loại danh mục STD là bắt buộc")
    SurveyStandard.CatalogType catalogType;

    @NotBlank(message = "Khoá Nhóm vỉa + Máy xúc là bắt buộc")
    String seamGroupExcavatorKey;

    /** Sáu thành phần đã ghép nên khoá — chỉ để Xem/Sửa hiện lại đúng, xem model. */
    String seamGroup;
    String benchGroup;
    String excavator;
    String mudMark;
    String excavationArea;
    String suffix;

    @NotNull(message = "Từ ngày là bắt buộc")
    LocalDate effectiveFrom;

    @NotNull(message = "Đến ngày là bắt buộc")
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
}
