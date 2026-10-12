package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PositionPermissionResponse {
    String resource;
    boolean c;
    boolean r;
    boolean u;
    boolean d;
    boolean a;
}
