package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.MatrixAxisEntryRequest;
import com.ecotel.thong_ke_cao_son.dto.request.MatrixCellUpsertRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.model.MatrixAxisEntry;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Danh mục dạng LƯỚI (bảng tra hai chiều).
 *
 * <p>Một controller phục vụ cả bốn lưới, phân biệt bằng {@code code} trên
 * đường dẫn — bốn lưới chỉ khác nhau ở nhãn và nguồn khoá, chép ra bốn bộ
 * endpoint giống hệt nhau không thêm được gì.
 */
@RestController
@RequestMapping("/api/matrix-catalogs")
@RequiredArgsConstructor
public class MatrixCatalogController {

    private final MatrixCatalogService service;

    /** Danh sách các lưới (chỉ phần khai báo, không kèm ô). */
    @GetMapping
    public ApiResponse<List<MatrixGridResponse>> list() {
        return ApiResponse.success(service.listDefinitions());
    }

    @GetMapping("/{code}")
    public ApiResponse<MatrixGridResponse> getGrid(@PathVariable String code) {
        return ApiResponse.success(service.getGrid(code));
    }

    /** Ghi nhiều ô một lần; {@code value} null nghĩa là xoá ô. */
    @PutMapping("/{code}/cells")
    public ApiResponse<Map<String, Integer>> upsertCells(
            @PathVariable String code,
            @Valid @RequestBody List<MatrixCellUpsertRequest> cells) {
        return ApiResponse.success(Map.of("affected", service.upsertCells(code, cells)));
    }

    @PostMapping("/{code}/rows")
    public ApiResponse<MatrixGridResponse> addRows(
            @PathVariable String code,
            @Valid @RequestBody List<MatrixAxisEntryRequest> rows) {
        return ApiResponse.success(
                service.addAxisEntries(code, MatrixAxisEntry.Axis.ROW, rows));
    }

    @PostMapping("/{code}/cols")
    public ApiResponse<MatrixGridResponse> addCols(
            @PathVariable String code,
            @Valid @RequestBody List<MatrixAxisEntryRequest> cols) {
        return ApiResponse.success(
                service.addAxisEntries(code, MatrixAxisEntry.Axis.COL, cols));
    }

    /**
     * Khoá đi qua tham số truy vấn chứ không nằm trên đường dẫn: mã thật có
     * dấu chấm và dấu cộng (vd {@code PA.PCMB.S+90}) nên đặt trên path sẽ bị
     * cắt hoặc giải mã sai.
     */
    @DeleteMapping("/{code}/rows")
    public ApiResponse<MatrixGridResponse> removeRow(
            @PathVariable String code, @RequestParam String key) {
        return ApiResponse.success(
                service.removeAxisEntry(code, MatrixAxisEntry.Axis.ROW, key));
    }

    @DeleteMapping("/{code}/cols")
    public ApiResponse<MatrixGridResponse> removeCol(
            @PathVariable String code, @RequestParam String key) {
        return ApiResponse.success(
                service.removeAxisEntry(code, MatrixAxisEntry.Axis.COL, key));
    }
}
