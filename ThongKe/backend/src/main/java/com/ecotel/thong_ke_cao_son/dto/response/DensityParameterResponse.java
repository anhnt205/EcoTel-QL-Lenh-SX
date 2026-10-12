package com.ecotel.thong_ke_cao_son.dto.response;

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
public class DensityParameterResponse {

    Long id;

    Long cargoTypeId;
    String cargoTypeCode;
    String cargoTypeName;

    /**
     * Ba trường CHỈ ĐỌC kéo theo Chủng loại hàng — mockup hiện chúng cạnh
     * mỗi dòng để người nhập đối chiếu. Không cho sửa ở đây: sửa được thì
     * chính là nhập trùng dữ liệu của danh mục Chủng loại hàng.
     */
    String cargoGroupName;
    String acceptanceProduct;
    String ttlClh;

    Long excavationAreaId;
    /** "Tất cả khu vực" khi bản ghi không gắn khu vực cụ thể. */
    String excavationAreaName;

    LocalDate effectiveFrom;
    LocalDate effectiveTo;
    BigDecimal densityWet;
    BigDecimal densityDry;
    String note;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
