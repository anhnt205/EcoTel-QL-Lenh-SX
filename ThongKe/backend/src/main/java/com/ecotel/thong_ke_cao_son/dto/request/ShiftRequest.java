package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/** Thêm/sửa Ca làm việc. */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ShiftRequest {

    @NotNull(message = "Ca làm việc là bắt buộc")
    Integer name;

    String code;

    String description;

    @Pattern(regexp = "^$|^([01]?\\d|2[0-3]):[0-5]\\d$", message = "Giờ bắt đầu phải có dạng HH:mm")
    String startTime;

    @Pattern(regexp = "^$|^([01]?\\d|2[0-3]):[0-5]\\d$", message = "Giờ kết thúc phải có dạng HH:mm")
    String endTime;
}
