package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MaterialResponse {
    Long id;
    String name;
    String code;
    String description;
    String acceptedProduct;
    List<MaterialValueHistoryResponse> valueHistory;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
