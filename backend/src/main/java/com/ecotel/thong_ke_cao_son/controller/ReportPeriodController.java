package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReportPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodResponse;
import com.ecotel.thong_ke_cao_son.service.ReportPeriodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Kỳ báo cáo (QĐ-05). */
@RestController
@RequestMapping("/api/report-periods")
@RequiredArgsConstructor
public class ReportPeriodController {

    private final ReportPeriodService service;

    @GetMapping
    public ApiResponse<PageResponse<ReportPeriodResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    /** Các kỳ của một tháng, đã sắp theo số kỳ — dùng cho combobox chọn kỳ. */
    @GetMapping("/by-month")
    public ApiResponse<List<ReportPeriodResponse>> getByMonth(
            @RequestParam int year, @RequestParam int month) {
        return ApiResponse.success(service.getByMonth(year, month));
    }

    @GetMapping("/{id}")
    public ApiResponse<ReportPeriodResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<ReportPeriodResponse> create(@Valid @RequestBody ReportPeriodRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<ReportPeriodResponse>> bulkCreate(
            @Valid @RequestBody List<ReportPeriodRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    /** Sinh nhanh kỳ cho một tháng theo mốc mặc định, rồi cho sửa lại. */
    @PostMapping("/generate")
    public ApiResponse<List<ReportPeriodResponse>> generate(
            @RequestParam int year, @RequestParam int month) {
        return ApiResponse.success(service.generateForMonth(year, month));
    }

    @PutMapping("/{id}")
    public ApiResponse<ReportPeriodResponse> update(
            @PathVariable Long id, @Valid @RequestBody ReportPeriodRequest request) {
        return ApiResponse.success(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(service.bulkDelete(request.getIds()));
    }
}
