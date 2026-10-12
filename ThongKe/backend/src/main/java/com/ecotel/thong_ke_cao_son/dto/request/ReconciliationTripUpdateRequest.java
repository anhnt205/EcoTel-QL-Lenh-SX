package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReconciliationTripUpdateRequest {

    // Đúng 1 trong 2 phải có giá trị — xác định sửa chuyến bên nào
    private Long transportReportTripId;
    private Long excavationReportTripId;

    // Các field dưới đây đều KHÔNG bắt buộc — chỉ field nào có giá trị mới được cập nhật (partial update)
    private Long cargoTypeId;
    private Integer tripCount;
    private LoadLevelType loadLevelType;

    @Pattern(regexp = "^\\d+/\\d+$", message = "Giá trị mức tải phải dạng x/y, ví dụ 1/2")
    private String loadLevelCustomValue;

    // "Số thẻ lương" — sửa employee ở HEADER của report chứa chuyến này,
    // ảnh hưởng tới TẤT CẢ chuyến khác cùng report (vì employee là field header, không phải trip).
    private Long employeeId;
}