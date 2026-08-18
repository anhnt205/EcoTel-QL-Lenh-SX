package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.ReconciliationStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReconciliationDecisionResponse {
    private ReconciliationStatus status;
    private String note;
}