package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExcavationReportTripRequest {

    private Integer tripCount;

    @NotNull(message = "Loại hàng là bắt buộc")
    private Long cargoTypeId;

    @NotNull(message = "Tải trọng là bắt buộc")
    private LoadLevelType loadLevelType;

    @Pattern(regexp = "^\\d+/\\d+$", message = "Giá trị mức tải phải dạng x/y, ví dụ 1/2")
    private String loadLevelCustomValue;
}
