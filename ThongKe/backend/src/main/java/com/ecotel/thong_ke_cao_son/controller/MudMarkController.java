package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.MudMarkRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MudMarkResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.MudMarkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Ký hiệu bùn. */
@RestController
@RequestMapping("/api/mud-marks")
@RequirePermission(resource = "mud-marks")
@RequiredArgsConstructor
public class MudMarkController {

    private final MudMarkService service;

    @GetMapping
    public ApiResponse<PageResponse<MudMarkResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<MudMarkResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<MudMarkResponse> create(@Valid @RequestBody MudMarkRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<MudMarkResponse>> bulkCreate(
            @Valid @RequestBody List<MudMarkRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<MudMarkResponse> update(
            @PathVariable Long id, @Valid @RequestBody MudMarkRequest request) {
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
