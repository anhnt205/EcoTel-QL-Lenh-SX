package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportPeriodResponse {
    Long id;
    Integer year;
    Integer month;
    Integer periodIndex;
    LocalDate fromDate;
    LocalDate toDate;
    String displayName;
    /** Số ngày của kỳ — kỳ cuối tháng ngắn hơn, cần hiện để tránh hiểu nhầm. */
    Integer dayCount;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
