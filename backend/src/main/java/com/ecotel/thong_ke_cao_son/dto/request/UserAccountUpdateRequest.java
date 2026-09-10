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

/** Sửa tài khoản — Danh mục Hệ thống. {@code password} để trống = không đổi mật khẩu. */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserAccountUpdateRequest {

    @NotBlank(message = "Số thẻ lương là bắt buộc")
    String salaryCode;

    @NotBlank(message = "Họ và tên là bắt buộc")
    String fullName;

    @NotNull(message = "Chức vụ là bắt buộc")
    Long positionId;

    @NotNull(message = "Trạng thái hoạt động là bắt buộc")
    Boolean active;

    /** Để trống (null/rỗng) = giữ nguyên mật khẩu cũ. */
    @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
    String password;

    /**
     * Quyền RIÊNG của tài khoản — LUÔN thay thế toàn bộ (không merge từng
     * dòng), giống {@code PositionRequest.permissions}. Gửi rỗng nghĩa là
     * "xoá hết quyền riêng, quay về thừa kế theo Chức vụ" — xem
     * {@code LocalAuthService.permissionsFor}.
     */
    @Valid
    List<PositionPermissionItem> permissions = new ArrayList<>();
}
