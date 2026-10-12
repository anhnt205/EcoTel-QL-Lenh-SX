package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ReportPeriodAuditAction;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Một dòng lịch sử chốt/mở khoá kỳ (QĐ-03). */
@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportPeriodAuditResponse {
    Long id;
    ReportPeriodAuditAction action;
    String performedByUsername;
    String performedByFullName;
    LocalDateTime performedAt;
    String reason;
    Boolean tkeMode;
    BigDecimal totalM3;
    BigDecimal totalTon;
    BigDecimal totalTkm;
}
