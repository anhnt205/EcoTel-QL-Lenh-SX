package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ExcelImportResultResponse {
    private int totalRows;
    private int successReportCount;
    private int errorRowCount;
    private List<String> errors; // "Dòng 5: Không tìm thấy Số xe 'XE-999'"
}
