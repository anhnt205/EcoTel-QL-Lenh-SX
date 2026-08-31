package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.MatrixAxisEntryRequest;
import com.ecotel.thong_ke_cao_son.dto.request.MatrixCellUpsertRequest;
import com.ecotel.thong_ke_cao_son.dto.request.MatrixVersionRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.model.MatrixAxisEntry;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Danh mục dạng LƯỚI (bảng tra hai chiều).
 *
 * <p>Một controller phục vụ cả bốn lưới, phân biệt bằng {@code code} trên
 * đường dẫn — bốn lưới chỉ khác nhau ở nhãn và nguồn khoá.
 *
 * <p><b>Có PHIÊN BẢN theo thời gian.</b> Định mức là thứ nhân viên thống kê
 * khai lại theo kỳ, nên mỗi lưới giữ nhiều phiên bản; engine tra theo ngày
 * sản xuất để chạy lại báo cáo cũ vẫn ra đúng số cũ.
 */
@RestController
@RequestMapping("/api/matrix-catalogs")
@RequiredArgsConstructor
public class MatrixCatalogController {

    private final MatrixCatalogService service;

    /** Danh sách các lưới (chỉ phần khai báo). */
    @GetMapping
    public ApiResponse<List<MatrixGridResponse>> list() {
        return ApiResponse.success(service.listDefinitions());
    }

    /**
     * Lưới của một mã.
     *
     * @param versionId xem đúng một phiên bản
     * @param date      xem phiên bản có hiệu lực tại ngày này
     *                  (bỏ cả hai thì lấy phiên bản mới nhất)
     */
    @GetMapping("/{code}")
    public ApiResponse<MatrixGridResponse> getGrid(
            @PathVariable String code,
            @RequestParam(required = false) Long versionId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (versionId != null) return ApiResponse.success(service.getGridByVersion(versionId));
        if (date != null) return ApiResponse.success(service.getGridAt(code, date));
        return ApiResponse.success(service.getGrid(code));
    }

    /** Mọi phiên bản của một lưới, mới nhất trước. */
    @GetMapping("/{code}/versions")
    public ApiResponse<List<MatrixGridResponse>> versions(@PathVariable String code) {
        return ApiResponse.success(service.listVersions(code));
    }

    /**
     * Tạo phiên bản mới, mặc định SAO CHÉP toàn bộ giá trị từ phiên bản nguồn
     * — lưới định mức có hàng nghìn ô, nhập lại từ đầu mỗi kỳ là không thực tế.
     */
    @PostMapping("/{code}/versions")
    public ApiResponse<MatrixGridResponse> createVersion(
            @PathVariable String code,
            @Valid @RequestBody MatrixVersionRequest request) {
        return ApiResponse.success(service.createVersion(
                code, request.getSourceId(), request.getEffectiveFrom(),
                request.getEffectiveTo(), request.getVersionLabel(),
                !Boolean.FALSE.equals(request.getCopyCells())));
    }

    /**
     * Xoá một phiên bản. Phiên bản liền trước được mở lại để không thủng
     * khoảng thời gian; phiên bản cuối cùng thì không cho xoá.
     */
    @DeleteMapping("/{code}/versions/{versionId}")
    public ApiResponse<Void> deleteVersion(@PathVariable String code,
                                           @PathVariable Long versionId) {
        service.deleteVersion(code, versionId);
        return ApiResponse.success(null);
    }

    /** Ghi nhiều ô một lần; {@code value} null nghĩa là xoá ô. */
    @PutMapping("/{code}/cells")
    public ApiResponse<Map<String, Integer>> upsertCells(
            @PathVariable String code,
            @RequestParam(required = false) Long versionId,
            @Valid @RequestBody List<MatrixCellUpsertRequest> cells) {
        return ApiResponse.success(Map.of("affected", service.upsertCells(code, versionId, cells)));
    }

    @PostMapping("/{code}/rows")
    public ApiResponse<MatrixGridResponse> addRows(
            @PathVariable String code,
            @RequestParam(required = false) Long versionId,
            @Valid @RequestBody List<MatrixAxisEntryRequest> rows) {
        return ApiResponse.success(
                service.addAxisEntries(code, versionId, MatrixAxisEntry.Axis.ROW, rows));
    }

    @PostMapping("/{code}/cols")
    public ApiResponse<MatrixGridResponse> addCols(
            @PathVariable String code,
            @RequestParam(required = false) Long versionId,
            @Valid @RequestBody List<MatrixAxisEntryRequest> cols) {
        return ApiResponse.success(
                service.addAxisEntries(code, versionId, MatrixAxisEntry.Axis.COL, cols));
    }

    /**
     * Khoá đi qua tham số truy vấn chứ không nằm trên đường dẫn: mã thật có
     * dấu chấm và dấu cộng (vd {@code PA.PCMB.S+90}) nên đặt trên path sẽ bị
     * cắt hoặc giải mã sai.
     */
    @DeleteMapping("/{code}/rows")
    public ApiResponse<MatrixGridResponse> removeRow(
            @PathVariable String code,
            @RequestParam(required = false) Long versionId,
            @RequestParam String key) {
        return ApiResponse.success(
                service.removeAxisEntry(code, versionId, MatrixAxisEntry.Axis.ROW, key));
    }

    @DeleteMapping("/{code}/cols")
    public ApiResponse<MatrixGridResponse> removeCol(
            @PathVariable String code,
            @RequestParam(required = false) Long versionId,
            @RequestParam String key) {
        return ApiResponse.success(
                service.removeAxisEntry(code, versionId, MatrixAxisEntry.Axis.COL, key));
    }
}
