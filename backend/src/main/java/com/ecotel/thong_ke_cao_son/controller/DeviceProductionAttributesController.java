package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.request.DeviceProductionAttributesRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DeviceResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.service.DeviceProductionAttributesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Khai báo thuộc tính sản lượng cho thiết bị (mục S3).
 *
 * <p>Tách khỏi {@code /api/devices} — endpoint kia là chỉ-đọc và phục vụ việc
 * tra cứu thiết bị nói chung. Ở đây chỉ ghi được đúng phần sản lượng.
 */
@RestController
@RequestMapping("/api/device-production-attributes")
@RequiredArgsConstructor
public class DeviceProductionAttributesController {

    private final DeviceProductionAttributesService service;

    @GetMapping
    public ApiResponse<PageResponse<DeviceResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) DeviceGroup categoryGroup,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, categoryGroup, pageable));
    }

    @PutMapping("/{id}")
    public ApiResponse<DeviceResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody DeviceProductionAttributesRequest request) {
        return ApiResponse.success(service.update(id, request));
    }

    /**
     * Ghi hàng loạt theo mã thiết bị. Dùng chung tên {@code /bulk} với các
     * danh mục khác để màn danh mục dùng chung gọi được, nhưng ở đây nghĩa là
     * CẬP NHẬT thiết bị đã có, không phải tạo mới.
     */
    @PostMapping("/bulk")
    public ApiResponse<List<DeviceResponse>> bulkUpsert(
            @Valid @RequestBody List<DeviceProductionAttributesRequest> requests) {
        return ApiResponse.success(service.bulkUpsert(requests));
    }
}
