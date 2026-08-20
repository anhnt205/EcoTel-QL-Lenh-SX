package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class ReconciliationSearchRequest {

    @NotNull(message = "Từ ngày là bắt buộc")
    private LocalDate fromDate;

    @NotNull(message = "Đến ngày là bắt buộc")
    private LocalDate toDate;

    private List<Long> shiftIds;
    private List<Long> deviceIds;

    private ApprovalStatus status; // lọc theo trạng thái duyệt của báo cáo
}
