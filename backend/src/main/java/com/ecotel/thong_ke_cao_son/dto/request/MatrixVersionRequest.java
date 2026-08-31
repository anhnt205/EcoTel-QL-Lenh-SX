package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

/** Tạo một phiên bản mới của lưới định mức. */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MatrixVersionRequest {

    /** Phiên bản nguồn để sao chép; để trống thì lấy phiên bản mới nhất. */
    Long sourceId;

    @NotNull(message = "Ngày bắt đầu hiệu lực là bắt buộc")
    LocalDate effectiveFrom;

    /** Để trống nghĩa là còn hiệu lực đến khi có phiên bản sau. */
    LocalDate effectiveTo;

    /** Nhãn ngắn, vd "T2-2025". */
    String versionLabel;

    /**
     * Sao chép giá trị ô từ phiên bản nguồn. Mặc định CÓ — lưới định mức có
     * hàng nghìn ô, nhập lại từ đầu mỗi tháng là không thực tế.
     */
    Boolean copyCells = true;
}
