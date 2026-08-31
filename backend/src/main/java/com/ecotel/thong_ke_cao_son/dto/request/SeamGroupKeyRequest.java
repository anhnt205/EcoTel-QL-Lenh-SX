package com.ecotel.thong_ke_cao_son.dto.request;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** Thành phần để ghép khoá "Nhóm vỉa + Máy xúc". */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeamGroupKeyRequest {
    String seamGroup;
    String benchGroup;
    String excavator;
    String mudMark;
    String excavationArea;
    /** Hậu tố người dùng chọn: BK, SPNT, 2,25, dthai. */
    List<String> suffixes;
}
