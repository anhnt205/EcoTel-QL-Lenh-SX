package com.ecotel.thong_ke_cao_son.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BulkDeleteRequest {
    @NotEmpty(message = "Danh sách ID không được rỗng")
    private List<Long> ids;
}
