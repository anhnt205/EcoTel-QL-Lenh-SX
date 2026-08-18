package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportStatusUpdateRequest {

    @NotNull(message = "Loại báo cáo là bắt buộc")
    private ReportType reportType; // TRANSPORT hoặc EXCAVATION

    @NotNull(message = "ID báo cáo là bắt buộc")
    private Long reportId;

    @NotNull(message = "Trạng thái là bắt buộc")
    private ApprovalStatus status;

    private String note;

    public enum ReportType {
        TRANSPORT,
        EXCAVATION
    }
}
