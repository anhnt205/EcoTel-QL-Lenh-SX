package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DepartmentRequest {

    @NotBlank(message = "Mã phòng ban là bắt buộc")
    String code;

    @NotBlank(message = "Tên phòng ban là bắt buộc")
    String name;

    String description;

    /** Danh sách resource (xem {@code PermissionResources.ALL}) phòng ban được phép dùng. */
    Set<String> allowedResources = new LinkedHashSet<>();

    /** Xem javadoc {@code Department.fullDataScope}. Null (chưa gửi) coi như false ở service. */
    Boolean fullDataScope;
}
