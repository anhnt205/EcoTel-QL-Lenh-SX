package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationAreaRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationAreaResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.ExcavationAreaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục Khu vực xúc. */
@RestController
@RequestMapping("/api/excavation-areas")
@RequiredArgsConstructor
public class ExcavationAreaController {

    private final ExcavationAreaService service;

    @GetMapping
    public ApiResponse<PageResponse<ExcavationAreaResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    /** Hai nhóm khu vực hợp lệ (CS/KC) — để giao diện không phải cắm cứng (QĐ-13). */
    @GetMapping("/area-groups")
    public ApiResponse<List<String>> areaGroups() {
        return ApiResponse.success(service.getAreaGroups());
    }

    @GetMapping("/{id}")
    public ApiResponse<ExcavationAreaResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<ExcavationAreaResponse> create(@Valid @RequestBody ExcavationAreaRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<ExcavationAreaResponse>> bulkCreate(
            @Valid @RequestBody List<ExcavationAreaRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<ExcavationAreaResponse> update(
            @PathVariable Long id, @Valid @RequestBody ExcavationAreaRequest request) {
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
