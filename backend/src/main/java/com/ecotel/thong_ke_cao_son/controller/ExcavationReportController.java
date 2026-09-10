package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportTripUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.excel.ExcavationReportExcelExporter;
import com.ecotel.thong_ke_cao_son.excel.ExcavationReportExcelImporter;
import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import com.ecotel.thong_ke_cao_son.service.ExcavationReportService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/excavation-reports")
@RequirePermission(resource = "excavation-reports")
@RequiredArgsConstructor
public class ExcavationReportController {

    private final ExcavationReportService excavationReportService;

    private final ExcavationReportExcelExporter excelExporter;
    private final ExcavationReportExcelImporter excelImporter;

    @PostMapping
    public ApiResponse<ExcavationReportResponse> create(@Valid @RequestBody ExcavationReportRequest request) {
        return ApiResponse.created(excavationReportService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<ExcavationReportResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(excavationReportService.getById(id));
    }

    @GetMapping
    public ApiResponse<PageResponse<ExcavationReportResponse>> search(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate,
            @RequestParam(required = false) List<Long> shiftIds,
            @RequestParam(required = false) List<Long> excavatorIds,
            @RequestParam(required = false) List<Long> receivingLocationIds,
            @RequestParam(required = false) List<String> excavationFloors,
            Pageable pageable) {
        return ApiResponse.success(
                excavationReportService.search(fromDate, toDate, shiftIds, excavatorIds,
                        receivingLocationIds, excavationFloors, pageable));
    }

    /**
     * Toàn bộ giá trị Tầng xúc trong khoảng ngày — ĐỘC LẬP phân trang và mọi
     * bộ lọc khác, để làm tuỳ chọn cho ô lọc "Tầng xúc" (xem javadoc
     * {@code ExcavationReportRepository.findDistinctExcavationFloors}).
     */
    @GetMapping("/excavation-floors")
    public ApiResponse<List<String>> excavationFloors(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate) {
        return ApiResponse.success(excavationReportService.getDistinctExcavationFloors(fromDate, toDate));
    }

    @PutMapping("/{id}")
    public ApiResponse<ExcavationReportResponse> update(
            @PathVariable Long id, @Valid @RequestBody ExcavationReportRequest request) {
        return ApiResponse.success(excavationReportService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        excavationReportService.delete(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/bulk")
    public ApiResponse<List<ExcavationReportResponse>> bulkCreate(
            @Valid @RequestBody List<@Valid ExcavationReportRequest> requests) {
        return ApiResponse.created(excavationReportService.bulkCreate(requests));
    }

    @PutMapping("/bulk")
    public ApiResponse<List<ExcavationReportResponse>> bulkUpdate(
            @Valid @RequestBody List<@Valid ExcavationReportBulkUpdateItem> items) {
        return ApiResponse.success(excavationReportService.bulkUpdate(items));
    }

    @DeleteMapping("/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(excavationReportService.bulkDelete(request.getIds()));
    }

    // ================= TRIP-LEVEL OPERATIONS =================

    @GetMapping("/trips/{tripId}")
    public ApiResponse<ExcavationReportTripResponse> getTrip(@PathVariable Long tripId) {
        return ApiResponse.success(excavationReportService.getTrip(tripId));
    }

    @PutMapping("/trips/{tripId}")
    public ApiResponse<ExcavationReportTripResponse> updateTrip(
            @PathVariable Long tripId,
            @Valid @RequestBody ExcavationReportTripUpdateRequest request) {
        return ApiResponse.success(excavationReportService.updateTrip(tripId, request));
    }

    @DeleteMapping("/trips/{tripId}")
    public ApiResponse<Void> deleteTrip(@PathVariable Long tripId) {
        excavationReportService.deleteTrip(tripId);
        return ApiResponse.success(null);
    }

    @PutMapping("/trips/bulk")
    public ApiResponse<List<ExcavationReportTripResponse>> bulkUpdateTrips(
            @Valid @RequestBody List<@Valid ExcavationTripBulkUpdateItem> items) {
        return ApiResponse.success(excavationReportService.bulkUpdateTrips(items));
    }

    @DeleteMapping("/trips/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDeleteTrips(
            @Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(excavationReportService.bulkDeleteTrips(request.getIds()));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate,
            @RequestParam(required = false) List<Long> shiftIds,
            @RequestParam(required = false) List<Long> excavatorIds,
            @RequestParam(required = false) List<Long> receivingLocationIds,
            @RequestParam(required = false) List<String> excavationFloors) {

        List<ExcavationReport> reports = excavationReportService
                .findAllForExport(fromDate, toDate, shiftIds, excavatorIds, receivingLocationIds, excavationFloors);

        byte[] excelBytes = excelExporter.export(reports);

        String filename = "bao-cao-khai-thac_" + fromDate + "_" + toDate + ".xlsx";
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ExcelImportResultResponse> importExcel(
            @Parameter(
                    description = "File Excel cần import",
                    required = true,
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(type = "string", format = "binary")
                    )
            )
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.success(excelImporter.importFile(file));
    }
}
