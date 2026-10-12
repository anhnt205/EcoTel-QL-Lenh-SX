package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReconciliationDecisionResponse {
    private ApprovalStatus status;
    private String note;
}