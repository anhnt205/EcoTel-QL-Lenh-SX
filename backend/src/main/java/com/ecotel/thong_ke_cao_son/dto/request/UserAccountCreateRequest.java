package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

/** Tạo tài khoản mới — Danh mục Hệ thống. Chỉ chọn Chức vụ, KHÔNG chọn Role (đã bỏ, xem LocalAuthService). */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserAccountCreateRequest {

    @NotBlank(message = "Tên đăng nhập là bắt buộc")
    String username;

    @NotBlank(message = "Mật khẩu là bắt buộc")
    @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
    String password;

    @NotBlank(message = "Số thẻ lương là bắt buộc")
    String salaryCode;

    @NotBlank(message = "Họ và tên là bắt buộc")
    String fullName;

    @NotNull(message = "Chức vụ là bắt buộc")
    Long positionId;

    /**
     * Quyền RIÊNG của tài khoản — rỗng = thừa kế theo Chức vụ (xem
     * {@code LocalAuthService.permissionsFor}). Form Tài khoản đọc sẵn quyền
     * của Chức vụ đã chọn để gợi ý, người tạo có thể sửa trước khi lưu.
     */
    @Valid
    List<PositionPermissionItem> permissions = new ArrayList<>();
}
