package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripReportRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationTripReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.ExcavationTripReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/excavation-trip-reports")
@RequiredArgsConstructor
public class ExcavationTripReportController {

    private final ExcavationTripReportService excavationTripReportService;

    @PostMapping
    public ApiResponse<ExcavationTripReportResponse> create(@Valid @RequestBody ExcavationTripReportRequest request) {
        return ApiResponse.created(excavationTripReportService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<ExcavationTripReportResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(excavationTripReportService.getById(id));
    }

    @GetMapping
    public ApiResponse<PageResponse<ExcavationTripReportResponse>> search(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate,
            @RequestParam(required = false) List<Long> shiftIds,
            @RequestParam(required = false) List<Long> excavatorIds,
            Pageable pageable) {
        return ApiResponse.success(
                excavationTripReportService.search(fromDate, toDate, shiftIds, excavatorIds, pageable));
    }

    @PutMapping("/{id}")
    public ApiResponse<ExcavationTripReportResponse> update(
            @PathVariable Long id, @Valid @RequestBody ExcavationTripReportRequest request) {
        return ApiResponse.success(excavationTripReportService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        excavationTripReportService.delete(id);
        return ApiResponse.success(null);
    }
}
