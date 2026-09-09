package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder(toBuilder = true)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PositionResponse {
    Long id;
    String code;
    String name;
    String description;
    Long departmentId;
    String departmentName;
    List<PositionPermissionResponse> permissions;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
