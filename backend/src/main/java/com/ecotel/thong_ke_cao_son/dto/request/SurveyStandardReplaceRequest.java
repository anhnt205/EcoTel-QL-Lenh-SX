package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Thân yêu cầu cho "thay thẳng một lô" — xem
 * {@code SurveyStandardService#replaceBatch} về lý do cần một giao dịch
 * duy nhất thay vì gọi xoá và tạo mới rời nhau từ phía gọi.
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SurveyStandardReplaceRequest {

    /** Id các bản ghi CŨ cần xoá. Mảng rỗng nếu không có gì để xoá. */
    @NotNull(message = "deleteIds là bắt buộc — để mảng rỗng nếu không xoá gì")
    List<Long> deleteIds;

    /** Bản ghi MỚI sẽ thay vào chỗ các bản ghi vừa xoá. */
    @NotNull(message = "creates là bắt buộc")
    @Valid
    List<SurveyStandardRequest> creates;
}
