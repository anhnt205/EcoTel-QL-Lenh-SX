package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.Role;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder(toBuilder = true)
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
    /**
     * Quyền RIÊNG của tài khoản này — rỗng nghĩa là đang thừa kế theo Chức vụ
     * (xem {@code LocalAuthService.permissionsFor}), KHÔNG phải "không có
     * quyền gì". Form sửa tài khoản phân biệt 2 trường hợp này để quyết định
     * hiện mẫu Chức vụ hay hiện đúng quyền đã lưu riêng.
     */
    List<PositionPermissionResponse> permissions;
    List<String> deviceTokens;
    LocalDateTime passwordChangedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
