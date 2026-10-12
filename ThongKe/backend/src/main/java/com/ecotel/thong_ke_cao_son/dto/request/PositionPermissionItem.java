package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/** 1 dòng quyền C/R/U/D/A của Chức vụ trên 1 resource — xem {@code PositionPermission}. */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PositionPermissionItem {

    @NotBlank(message = "Resource là bắt buộc")
    String resource;

    boolean c;
    boolean r;
    boolean u;
    boolean d;
    boolean a;
}
