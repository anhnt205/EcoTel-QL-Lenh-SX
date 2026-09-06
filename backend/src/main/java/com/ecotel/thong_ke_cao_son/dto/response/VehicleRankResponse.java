package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleRankResponse {
    Long id;
    String code;
    /**
     * Nhãn hiển thị — danh mục Hạng xe KHÔNG có trường tên riêng, nhưng cả
     * combobox tham chiếu ({@code optionsPath}) lẫn bảng tra tên→id khi nhập
     * Excel đều đọc theo quy ước {@code name}. Trả chính mã để hai chỗ đó
     * không hiện nhãn trống.
     */
    String name;
    Integer rank;
    Long vehicleRankGroupId;
    /** Tên — bảng danh mục hiển thị theo quy ước "<khoá bỏ Id>Name". */
    String vehicleRankGroupName;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
