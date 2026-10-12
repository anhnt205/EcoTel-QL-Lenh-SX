package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/** Body của {@code POST /api/report-periods/{id}/unlock}. */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportPeriodUnlockRequest {

    /** Bắt buộc — QĐ-03: mở khoá phải "ghi lại ai mở, lúc nào, lý do". */
    @NotBlank(message = "Lý do mở khoá là bắt buộc")
    String reason;
}
