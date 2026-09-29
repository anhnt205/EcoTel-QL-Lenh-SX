package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationSide;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReconciliationHistoryEntryResponse {
    private Long id;
    private ReconciliationSide side;
    private String cargoTypeName;
    private Integer tripCount;
    private LoadLevelType loadLevelType;
    private String loadLevelCustomValue;
    private String employeeSalaryCode;
    private String employeeFullName;
    private String note;
    private LocalDateTime createdAt;
}
