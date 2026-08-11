package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BulkDeleteResponse {
    private int requestedCount;
    private int deletedCount;
}
