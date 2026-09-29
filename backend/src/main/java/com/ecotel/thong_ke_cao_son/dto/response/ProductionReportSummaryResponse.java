package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Phần đầu của màn Báo cáo thống kê: kỳ nào, tính lúc nào, và các tổng cộng.
 *
 * <p>Có {@code dayCount} vì kỳ cuối tháng ngắn hơn hẳn các kỳ khác — so sản
 * lượng tuyệt đối giữa các kỳ mà không biết số ngày sẽ gây hiểu nhầm (QĐ-05).
 */
@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductionReportSummaryResponse {

    Long periodId;
    String periodName;
    LocalDate fromDate;
    LocalDate toDate;
    Integer dayCount;

    /** Số chuyến đã tính. 0 nghĩa là kỳ chưa được tính lần nào. */
    long rowCount;

    /** Thời điểm tính gần nhất; null nếu chưa tính. */
    LocalDateTime calculatedAt;

    /** Kỳ được tính ở chế độ TKE (QĐ-03) hay chế độ trắc địa. */
    Boolean tkeMode;

    BigDecimal totalM3;
    BigDecimal totalTon;
    BigDecimal totalTkm;
    BigDecimal surveyM3;
    BigDecimal surveyTon;
    BigDecimal surveyTkm;
    BigDecimal finalTon;
    BigDecimal finalTkm;
}
