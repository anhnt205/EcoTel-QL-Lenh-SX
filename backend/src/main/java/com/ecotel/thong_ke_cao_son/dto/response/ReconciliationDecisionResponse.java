package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationFinalOption;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReconciliationDecisionResponse {
    private ReconciliationFinalOption finalOption;
    private String customCargoTypeName;
    private Integer customTripCount;
    private LoadLevelType customLoadLevelType;
    private String customLoadLevelCustomValue;
}
