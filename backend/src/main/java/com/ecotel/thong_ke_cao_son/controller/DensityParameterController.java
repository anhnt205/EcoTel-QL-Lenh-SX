package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.DensityParameterReplaceRequest;
import com.ecotel.thong_ke_cao_son.dto.request.DensityParameterRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DensityParameterResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.DensityParameterService;
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

/** Danh mục Tỷ trọng (QĐ-04). */
@RestController
@RequestMapping("/api/density-parameters")
@RequirePermission(resource = "density-parameters")
@RequiredArgsConstructor
public class DensityParameterController {

    private final DensityParameterService service;

    @GetMapping
    public ApiResponse<PageResponse<DensityParameterResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    /**
     * Tra tỷ trọng có hiệu lực tại một ngày.
     *
     * <p>Hữu ích để người dùng tự kiểm tra "ngày này hệ sẽ lấy dòng nào" —
     * đúng dòng mà engine tính sản lượng sẽ dùng.
     */
    @GetMapping("/lookup")
    public ApiResponse<DensityParameterResponse> lookup(
            @RequestParam Long cargoTypeId,
            @RequestParam(required = false) Long excavationAreaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(service.lookup(cargoTypeId, excavationAreaId, date));
    }

    @GetMapping("/{id}")
    public ApiResponse<DensityParameterResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<DensityParameterResponse> create(
            @Valid @RequestBody DensityParameterRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<DensityParameterResponse>> bulkCreate(
            @Valid @RequestBody List<DensityParameterRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<DensityParameterResponse> update(
            @PathVariable Long id, @Valid @RequestBody DensityParameterRequest request) {
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
     * Thay THẲNG một lô: xoá bản ghi cũ + tạo bản ghi mới trong MỘT giao
     * dịch. Dùng cho màn "Sửa tỷ trọng" — xem lý do cần atomic ở
     * {@link DensityParameterService#replaceBatch}.
     */
    @PutMapping("/batch")
    public ApiResponse<List<DensityParameterResponse>> replaceBatch(
            @Valid @RequestBody DensityParameterReplaceRequest request) {
        return ApiResponse.success(service.replaceBatch(request.getDeleteIds(), request.getCreates()));
    }
}
