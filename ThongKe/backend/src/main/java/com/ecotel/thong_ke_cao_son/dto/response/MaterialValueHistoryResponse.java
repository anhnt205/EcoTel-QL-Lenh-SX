package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MaterialValueHistoryResponse {
    Double density;
    Double dryDensity;
    LocalDateTime startTime;
    LocalDateTime endTime;
}
