package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** Kết quả ghép khoá — trả kèm các phần để giao diện hiện lại cho dễ kiểm. */
@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeamGroupKeyResponse {
    String key;
    List<String> parts;
}
