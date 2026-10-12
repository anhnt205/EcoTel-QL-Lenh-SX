package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

/**
 * Sửa siêu dữ liệu (ngày hiệu lực, nhãn, mô tả) của một phiên bản đã có —
 * không đụng trục hay ô.
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MatrixVersionUpdateRequest {

    @NotNull(message = "Ngày bắt đầu hiệu lực là bắt buộc")
    LocalDate effectiveFrom;

    LocalDate effectiveTo;

    String versionLabel;

    String note;
}
