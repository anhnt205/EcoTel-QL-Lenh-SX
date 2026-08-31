package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReceivingPointResponse {
    Long id;
    String code;
    String name;
    Long seamGroupId;
    /** Tên — bảng danh mục hiển thị theo quy ước "<khoá bỏ Id>Name". */
    String seamGroupName;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
