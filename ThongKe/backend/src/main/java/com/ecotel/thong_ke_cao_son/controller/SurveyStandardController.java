package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.SeamGroupKeyRequest;
import com.ecotel.thong_ke_cao_son.dto.request.SurveyStandardReplaceRequest;
import com.ecotel.thong_ke_cao_son.dto.request.SurveyStandardRequest;
import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.model.SurveyStandard;
import com.ecotel.thong_ke_cao_son.service.SeamGroupExcavatorKeys;
import com.ecotel.thong_ke_cao_son.service.SurveyStandardService;
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

/**
 * Danh mục STD (số liệu Trắc địa).
 *
 * <p>Một controller cho cả hai màn, phân biệt bằng tham số {@code catalogType}
 * — hai màn dùng chung cấu trúc, chỉ khác ở chỗ màn Đất SX/Than SX có thêm
 * khối Than.
 */
@RestController
@RequestMapping("/api/survey-standards")
@RequirePermission(resource = "survey-standards")
@RequiredArgsConstructor
public class SurveyStandardController {

    private final SurveyStandardService service;

    @GetMapping
    public ApiResponse<PageResponse<SurveyStandardResponse>> getAll(
            @RequestParam(required = false) SurveyStandard.CatalogType catalogType,
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(catalogType, keyword, pageable));
    }

    /**
     * Ghép khoá "Nhóm vỉa + Máy xúc" từ các thành phần.
     *
     * <p>Giao diện gọi endpoint này thay vì tự ghép ở phía client: khoá phải
     * được dựng đúng MỘT cách, nếu không dòng danh mục sẽ không bao giờ khớp
     * với khoá mà engine suy ra từ chuyến.
     */
    @PostMapping("/build-key")
    public ApiResponse<SeamGroupKeyResponse> buildKey(@RequestBody SeamGroupKeyRequest request) {
        // `suffix` (chuỗi tự do) có mặt thì ưu tiên — màn Thêm mới STD (Đất
        // SX/Than SX) gõ tự do; `suffixes` (danh sách hợp lệ) là màn "Dựng
        // khoá" cũ, vẫn giữ nguyên cho STD (Đất CN).
        String key = request.getSuffix() != null
                ? SeamGroupExcavatorKeys.compose(
                        request.getSeamGroup(), request.getBenchGroup(), request.getExcavator(),
                        request.getMudMark(), request.getExcavationArea(), request.getSuffix())
                : SeamGroupExcavatorKeys.compose(
                        request.getSeamGroup(), request.getBenchGroup(), request.getExcavator(),
                        request.getMudMark(), request.getExcavationArea(), request.getSuffixes());
        return ApiResponse.success(SeamGroupKeyResponse.builder()
                .key(key)
                .parts(SeamGroupExcavatorKeys.split(key))
                .build());
    }

    /** Danh sách hậu tố hợp lệ — để giao diện không phải cắm cứng. */
    @GetMapping("/key-suffixes")
    public ApiResponse<List<String>> keySuffixes() {
        return ApiResponse.success(SeamGroupExcavatorKeys.ALL_SUFFIXES);
    }

    /** Các khoá đã khai báo — gợi ý khi nhập dòng mới. */
    @GetMapping("/keys")
    public ApiResponse<List<String>> keys() {
        return ApiResponse.success(service.getDistinctKeys());
    }

    @GetMapping("/lookup")
    public ApiResponse<SurveyStandardResponse> lookup(
            @RequestParam SurveyStandard.CatalogType catalogType,
            @RequestParam String key,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(service.lookup(catalogType, key, date));
    }

    @GetMapping("/{id}")
    public ApiResponse<SurveyStandardResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<SurveyStandardResponse> create(
            @Valid @RequestBody SurveyStandardRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<SurveyStandardResponse>> bulkCreate(
            @Valid @RequestBody List<SurveyStandardRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<SurveyStandardResponse> update(
            @PathVariable Long id, @Valid @RequestBody SurveyStandardRequest request) {
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
     * Thay THẲNG một tập bản ghi: xoá bản ghi cũ + tạo bản ghi mới trong MỘT
     * giao dịch. Dùng cho màn Sửa — xem lý do cần atomic ở
     * {@link SurveyStandardService#replaceBatch}.
     */
    @PutMapping("/batch")
    public ApiResponse<List<SurveyStandardResponse>> replaceBatch(
            @Valid @RequestBody SurveyStandardReplaceRequest request) {
        return ApiResponse.success(service.replaceBatch(request.getDeleteIds(), request.getCreates()));
    }
}
