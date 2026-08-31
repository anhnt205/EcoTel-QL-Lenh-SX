package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportPeriodRequest {

    @NotNull(message = "Năm là bắt buộc")
    @Min(value = 2000, message = "Năm không hợp lệ")
    @Max(value = 2100, message = "Năm không hợp lệ")
    Integer year;

    @NotNull(message = "Tháng là bắt buộc")
    @Min(value = 1, message = "Tháng phải từ 1 đến 12")
    @Max(value = 12, message = "Tháng phải từ 1 đến 12")
    Integer month;

    @NotNull(message = "Số kỳ là bắt buộc")
    @Min(value = 1, message = "Số kỳ phải từ 1 trở lên")
    Integer periodIndex;

    @NotNull(message = "Từ ngày là bắt buộc")
    LocalDate fromDate;

    @NotNull(message = "Đến ngày là bắt buộc")
    LocalDate toDate;

    /** Để trống thì hệ tự sinh, ví dụ "Kỳ 01, 1/5 đến 7/5". */
    String displayName;

    String note;
}
