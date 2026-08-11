package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportResponse;
import com.ecotel.thong_ke_cao_son.service.TransportReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transport-reports")
@RequiredArgsConstructor
public class TransportReportController {

    private final TransportReportService transportReportService;

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
}
