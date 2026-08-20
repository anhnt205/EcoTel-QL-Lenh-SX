package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TripBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.excel.TransportReportExcelExporter;
import com.ecotel.thong_ke_cao_son.excel.TransportReportExcelImporter;
import com.ecotel.thong_ke_cao_son.model.TransportReport;
import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import com.ecotel.thong_ke_cao_son.repository.TransportReportRepository;
import com.ecotel.thong_ke_cao_son.repository.TransportReportTripRepository;
import com.ecotel.thong_ke_cao_son.service.TransportReportService;
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
@RequestMapping("/api/transport-reports")
@RequiredArgsConstructor
public class TransportReportController {

    private final TransportReportService transportReportService;
    private final TransportReportRepository transportReportRepository;
    private final TransportReportExcelExporter transportReportExcelExporter;
    private final TransportReportExcelImporter transportReportExcelImporter;

    @PostMapping
    public ApiResponse<TransportReportResponse> create(@Valid @RequestBody TransportReportRequest request) {
        return ApiResponse.created(transportReportService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<TransportReportResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(transportReportService.getById(id));
    }

    @GetMapping
    public ApiResponse<PageResponse<TransportReportResponse>> search(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate,
            @RequestParam(required = false) List<Long> shiftIds,
            @RequestParam(required = false) List<Long> deviceIds,
            Pageable pageable) {
        return ApiResponse.success(
                transportReportService.search(fromDate, toDate, shiftIds, deviceIds, pageable));
    }

    @PutMapping("/{id}")
    public ApiResponse<TransportReportResponse> update(
            @PathVariable Long id, @Valid @RequestBody TransportReportRequest request) {
        return ApiResponse.success(transportReportService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        transportReportService.delete(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/bulk")
    public ApiResponse<List<TransportReportResponse>> bulkCreate(
            @Valid @RequestBody List<@Valid TransportReportRequest> requests) {
        return ApiResponse.created(transportReportService.bulkCreate(requests));
    }

    @PutMapping("/bulk")
    public ApiResponse<List<TransportReportResponse>> bulkUpdate(
            @Valid @RequestBody List<@Valid TransportReportBulkUpdateItem> items) {
        return ApiResponse.success(transportReportService.bulkUpdate(items));
    }

    @DeleteMapping("/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(transportReportService.bulkDelete(request.getIds()));
    }

    // ================= TRIP-LEVEL OPERATIONS =================

    @PutMapping("/{reportId}/trips/{tripId}")
    public ApiResponse<TransportReportTripResponse> updateTrip(
            @PathVariable Long reportId,
            @PathVariable Long tripId,
            @Valid @RequestBody TransportReportTripRequest request) {
        return ApiResponse.success(transportReportService.updateTrip(reportId, tripId, request));
    }

    @DeleteMapping("/{reportId}/trips/{tripId}")
    public ApiResponse<Void> deleteTrip(
            @PathVariable Long reportId,
            @PathVariable Long tripId) {
        transportReportService.deleteTrip(reportId, tripId);
        return ApiResponse.success(null);
    }

    @PutMapping("/{reportId}/trips/bulk")
    public ApiResponse<List<TransportReportTripResponse>> bulkUpdateTrips(
            @PathVariable Long reportId,
            @Valid @RequestBody List<@Valid TripBulkUpdateItem> items) {
        return ApiResponse.success(transportReportService.bulkUpdateTrips(reportId, items));
    }

    @DeleteMapping("/{reportId}/trips/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDeleteTrips(
            @PathVariable Long reportId,
            @Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(transportReportService.bulkDeleteTrips(reportId, request.getIds()));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate,
            @RequestParam(required = false) List<Long> shiftIds,
            @RequestParam(required = false) List<Long> deviceIds) {

        List<TransportReport> reports = transportReportService.findAllForExport(fromDate, toDate, shiftIds, deviceIds);
        byte[] excelBytes = transportReportExcelExporter.export(reports);

        String filename = "bao-cao-van-tai_" + fromDate + "_" + toDate + ".xlsx";
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
        return ApiResponse.success(transportReportExcelImporter.importFile(file));
    }
}
