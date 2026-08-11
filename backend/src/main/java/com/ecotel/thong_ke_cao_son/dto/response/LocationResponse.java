package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocationResponse {
    Long id;
    String name;
    String code;
    String description;
    Double distance;
    Double longitude;
    Double latitude;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
