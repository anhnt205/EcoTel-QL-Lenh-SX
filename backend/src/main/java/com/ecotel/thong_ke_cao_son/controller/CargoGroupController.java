package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.CargoGroupRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoGroupResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.CargoGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Nhóm chủng loại hàng. */
@RestController
@RequestMapping("/api/cargo-groups")
@RequiredArgsConstructor
public class CargoGroupController {

    private final CargoGroupService service;

    @GetMapping
    public ApiResponse<PageResponse<CargoGroupResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<CargoGroupResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<CargoGroupResponse> create(@Valid @RequestBody CargoGroupRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<CargoGroupResponse>> bulkCreate(
            @Valid @RequestBody List<CargoGroupRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<CargoGroupResponse> update(
            @PathVariable Long id, @Valid @RequestBody CargoGroupRequest request) {
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
