package com.ecotel.thong_ke_cao_son.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReconciliationResubmitRequest {
    private Long transportReportTripId;
    private Long excavationReportTripId;
}
