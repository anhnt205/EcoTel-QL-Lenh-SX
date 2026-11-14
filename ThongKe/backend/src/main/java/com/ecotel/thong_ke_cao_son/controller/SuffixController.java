package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.SuffixRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.SuffixResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.SuffixService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Hậu tố. */
@RestController
@RequestMapping("/api/suffixes")
@RequirePermission(resource = "suffixes")
@RequiredArgsConstructor
public class SuffixController {

    private final SuffixService service;

    @GetMapping
    public ApiResponse<PageResponse<SuffixResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<SuffixResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<SuffixResponse> create(@Valid @RequestBody SuffixRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<SuffixResponse>> bulkCreate(
            @Valid @RequestBody List<SuffixRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<SuffixResponse> update(
            @PathVariable Long id, @Valid @RequestBody SuffixRequest request) {
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
