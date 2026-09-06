package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExcavationAreaResponse {
    Long id;
    String code;
    String name;
    /** Nhóm khu vực — {@code CS} / {@code KC}; xem QĐ-13. */
    String areaGroup;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
