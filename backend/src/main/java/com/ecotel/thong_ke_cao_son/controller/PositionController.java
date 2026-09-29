package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.PositionRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PositionResponse;
import com.ecotel.thong_ke_cao_son.service.PositionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

/** Danh mục Hệ thống — Chức vụ (kèm phân quyền C/R/U/D/A theo chức năng). */
@RestController
@RequestMapping("/api/positions")
@RequirePermission(resource = "positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;

    @GetMapping
    public ApiResponse<PageResponse<PositionResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) Long departmentId,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(positionService.getAll(keyword, departmentId, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<PositionResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(positionService.getById(id));
    }

    @PostMapping
    public ApiResponse<PositionResponse> create(@Valid @RequestBody PositionRequest request) {
        return ApiResponse.success(positionService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<PositionResponse> update(
            @PathVariable Long id, @Valid @RequestBody PositionRequest request) {
        return ApiResponse.success(positionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        positionService.delete(id);
        return ApiResponse.success(null);
    }
}
