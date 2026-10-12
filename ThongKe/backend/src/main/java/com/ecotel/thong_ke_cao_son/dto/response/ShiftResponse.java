package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ShiftResponse {
    Long id;
    Integer name;
    String code;
    String description;
    String startTime;
    String endTime;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
