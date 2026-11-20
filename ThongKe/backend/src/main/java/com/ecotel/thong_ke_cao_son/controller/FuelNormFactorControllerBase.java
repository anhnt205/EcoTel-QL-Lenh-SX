package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.FuelNormFactorRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.FuelNormFactorResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Các thao tác chung của năm danh mục hệ số ĐMNL/BSNL. Lớp cơ sở KHÔNG gắn đường dẫn và quyền: mỗi controller con tự khai
 * {@code @RequestMapping} và {@code @RequirePermission} (bộ lọc quyền đọc annotation trên lớp cụ thể).
 */
public abstract class FuelNormFactorControllerBase {

    private final FuelNormFactorService service;
    private final FuelNormFactorKind kind;

    protected FuelNormFactorControllerBase(FuelNormFactorService service, FuelNormFactorKind kind) {
        this.service = service;
        this.kind = kind;
    }

    @GetMapping
    public ApiResponse<PageResponse<FuelNormFactorResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            // Chỉ dùng cho nhóm BSNL: màn Hệ số BSNL tách tab theo loại (Roda, Ngày mưa, …)
            @RequestParam(required = false) String bsnlType,
            // Chỉ dùng cho nhóm HS Than: màn tách tab theo dạng điều kiện
            @RequestParam(required = false) String coalCondition,
            @ParameterObject
            @PageableDefault(size = 10, sort = "effectiveFrom", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(kind, keyword, bsnlType, coalCondition, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<FuelNormFactorResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(kind, id));
    }

    @PostMapping
    public ApiResponse<FuelNormFactorResponse> create(@Valid @RequestBody FuelNormFactorRequest request) {
        return ApiResponse.success(service.create(kind, request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<FuelNormFactorResponse>> bulkCreate(@Valid @RequestBody List<FuelNormFactorRequest> requests) {
        return ApiResponse.success(service.bulkCreate(kind, requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<FuelNormFactorResponse> update(@PathVariable Long id, @Valid @RequestBody FuelNormFactorRequest request) {
        return ApiResponse.success(service.update(kind, id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(kind, id);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(service.bulkDelete(kind, request.getIds()));
    }
}
