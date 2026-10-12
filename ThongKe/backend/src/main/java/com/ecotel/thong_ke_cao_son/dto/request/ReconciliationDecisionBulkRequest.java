package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ReconciliationDecisionBulkRequest {

    @NotEmpty(message = "Cần ít nhất 1 quyết định để lưu")
    @Valid
    private List<ReconciliationDecisionRequest> decisions;
}