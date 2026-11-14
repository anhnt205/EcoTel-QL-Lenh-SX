package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.CargoCategoryRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoCategoryResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.CargoCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Loại hàng. */
@RestController
@RequestMapping("/api/cargo-categories")
@RequirePermission(resource = "cargo-categories")
@RequiredArgsConstructor
public class CargoCategoryController {

    private final CargoCategoryService service;

    @GetMapping
    public ApiResponse<PageResponse<CargoCategoryResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<CargoCategoryResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<CargoCategoryResponse> create(@Valid @RequestBody CargoCategoryRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<CargoCategoryResponse>> bulkCreate(
            @Valid @RequestBody List<CargoCategoryRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<CargoCategoryResponse> update(
            @PathVariable Long id, @Valid @RequestBody CargoCategoryRequest request) {
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
