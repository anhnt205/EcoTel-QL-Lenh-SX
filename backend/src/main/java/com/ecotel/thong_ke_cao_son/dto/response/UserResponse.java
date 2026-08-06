package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.Role;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    Long id;
    String username;
    String fullName;
    String gender;
    String email;
    String phone;
    String avatar;
    String signature;
    String salaryCode;
    Long departmentId;
    String departmentName;
    Long positionId;
    String positionName;
    Role role;
    Boolean active;
    List<String> deviceTokens;
    LocalDateTime passwordChangedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
