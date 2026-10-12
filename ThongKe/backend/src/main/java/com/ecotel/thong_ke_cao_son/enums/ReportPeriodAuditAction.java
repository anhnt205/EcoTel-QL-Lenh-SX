package com.ecotel.thong_ke_cao_son.enums;

/** Hành động ghi vết trên kỳ báo cáo (QĐ-03). */
public enum ReportPeriodAuditAction {
    /** Chốt kỳ — đóng băng kết quả, chặn tính lại cho tới khi mở khoá. */
    LOCK,
    /** Mở khoá — bắt buộc trước khi đổi chế độ tính hoặc tính lại một kỳ đã chốt. */
    UNLOCK
}
