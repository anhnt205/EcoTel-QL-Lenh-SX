package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PositionRequest {

    @NotBlank(message = "Mã chức vụ là bắt buộc")
    String code;

    @NotBlank(message = "Tên chức vụ là bắt buộc")
    String name;

    String description;

    @NotNull(message = "Phòng ban là bắt buộc")
    Long departmentId;

    /** Thay THẾ TOÀN BỘ quyền hiện có của chức vụ (không phải merge từng dòng). */
    @Valid
    List<PositionPermissionItem> permissions = new ArrayList<>();
}
