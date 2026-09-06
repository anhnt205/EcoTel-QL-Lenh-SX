package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ClassificationRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ClassificationResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.ClassificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Phân loại. */
@RestController
@RequestMapping("/api/classifications")
@RequiredArgsConstructor
public class ClassificationController {

    private final ClassificationService service;

    @GetMapping
    public ApiResponse<PageResponse<ClassificationResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ClassificationResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<ClassificationResponse> create(@Valid @RequestBody ClassificationRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<ClassificationResponse>> bulkCreate(
            @Valid @RequestBody List<ClassificationRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<ClassificationResponse> update(
            @PathVariable Long id, @Valid @RequestBody ClassificationRequest request) {
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
