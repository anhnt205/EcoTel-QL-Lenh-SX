package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Mot o can ghi. {@code value} de null nghia la XOA o do (tra ve trang thai
 * chua khai bao), khong phai ghi so 0.
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MatrixCellUpsertRequest {

    @NotBlank(message = "Thiếu khoá dòng")
    String rowKey;

    @NotBlank(message = "Thiếu khoá cột")
    String colKey;

    BigDecimal value;
}
