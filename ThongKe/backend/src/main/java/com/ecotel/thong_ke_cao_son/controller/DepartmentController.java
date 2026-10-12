package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.DepartmentRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DepartmentResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Hệ thống — Phòng ban. */
@RestController
@RequestMapping("/api/departments")
@RequirePermission(resource = "departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public ApiResponse<PageResponse<DepartmentResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(departmentService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<DepartmentResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(departmentService.getById(id));
    }

    /** Toàn bộ resource hợp lệ để dựng checkbox "chức năng" khi thêm/sửa phòng ban. */
    @GetMapping("/available-resources")
    public ApiResponse<List<String>> getAvailableResources() {
        return ApiResponse.success(departmentService.getAvailableResources());
    }

    @PostMapping
    public ApiResponse<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        return ApiResponse.success(departmentService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<DepartmentResponse> update(
            @PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        return ApiResponse.success(departmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ApiResponse.success(null);
    }
}
