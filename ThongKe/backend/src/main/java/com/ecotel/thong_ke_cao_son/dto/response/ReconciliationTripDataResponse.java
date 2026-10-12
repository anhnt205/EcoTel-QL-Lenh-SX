package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReconciliationTripDataResponse {
    private String cargoTypeName;
    private Integer tripCount;
    private LoadLevelType loadLevelType;
    private String loadLevelCustomValue;
    private String employeeSalaryCode;
    private String employeeFullName;
}
