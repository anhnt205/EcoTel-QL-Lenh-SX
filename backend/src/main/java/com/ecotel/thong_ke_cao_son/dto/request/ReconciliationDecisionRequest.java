package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.ReconciliationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReconciliationDecisionRequest {

    private Long transportReportTripId;
    private Long excavationReportTripId;

    @NotNull(message = "Trạng thái duyệt là bắt buộc")
    private ReconciliationStatus status;

    private String note; // không bắt buộc
}