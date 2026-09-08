package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ModelPeriodReplaceRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ModelPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ModelPeriodResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.ModelPeriodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Danh mục Mô hình (m3/chuyến) — mirror {@code DensityParameterController}. */
@RestController
@RequestMapping("/api/model-periods")
@RequirePermission(resource = "model-periods")
@RequiredArgsConstructor
public class ModelPeriodController {

    private final ModelPeriodService service;

    @GetMapping
    public ApiResponse<PageResponse<ModelPeriodResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    @GetMapping("/lookup")
    public ApiResponse<ModelPeriodResponse> lookup(
            @RequestParam Long cargoTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(service.lookup(cargoTypeId, date));
    }

    @GetMapping("/{id}")
    public ApiResponse<ModelPeriodResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<ModelPeriodResponse> create(@Valid @RequestBody ModelPeriodRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<ModelPeriodResponse>> bulkCreate(
            @Valid @RequestBody List<ModelPeriodRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<ModelPeriodResponse> update(
            @PathVariable Long id, @Valid @RequestBody ModelPeriodRequest request) {
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

    /**
     * Thay THẲNG các dòng đã lưu trong MỘT giao dịch — dùng cho màn "Sửa mô
     * hình". Xem lý do cần atomic ở {@link ModelPeriodService#replaceBatch}.
     */
    @PutMapping("/batch")
    public ApiResponse<List<ModelPeriodResponse>> replaceBatch(
            @Valid @RequestBody ModelPeriodReplaceRequest request) {
        return ApiResponse.success(service.replaceBatch(request.getDeleteIds(), request.getCreates()));
    }
}
