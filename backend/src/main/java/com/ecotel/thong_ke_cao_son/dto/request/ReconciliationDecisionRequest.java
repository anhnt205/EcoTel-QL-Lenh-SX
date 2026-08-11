package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationFinalOption;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReconciliationDecisionRequest {

    private Long transportReportTripId;    // nullable — ít nhất 1 trong 2 phải có
    private Long excavationReportTripId;

    @NotNull(message = "Phương án chốt là bắt buộc")
    private ReconciliationFinalOption finalOption;

    // Chỉ bắt buộc khi finalOption = OTHER
    private Long customCargoTypeId;
    private Integer customTripCount;
    private LoadLevelType customLoadLevelType;

    @Pattern(regexp = "^\\d+/\\d+$", message = "Giá trị mức tải phải dạng x/y, ví dụ 1/2")
    private String customLoadLevelCustomValue;
}
