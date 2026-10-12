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
    /** Hậu tố người dùng CHỌN từ danh sách hợp lệ — màn "Dựng khoá" cũ. */
    List<String> suffixes;
    /**
     * Hậu tố người dùng GÕ TỰ DO — không lọc qua danh sách hợp lệ. Có mặt
     * (kể cả rỗng) thì ưu tiên hơn {@link #suffixes}; xem
     * {@code SeamGroupExcavatorKeys#compose(String, String, String, String, String, String)}.
     */
    String suffix;
}
