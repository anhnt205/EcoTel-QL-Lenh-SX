package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.DeviceRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DeviceResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.service.DeviceService;
import com.ecotel.thong_ke_cao_son.service.TaiSanSyncService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@RequirePermission(resource = "devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final TaiSanSyncService taiSanSyncService;

    // Đồng bộ danh mục thiết bị từ QL-TAISAN (nguồn gốc) — xem TaiSanSyncService.
    // Gọi thủ công (giống nút "Đồng bộ từ manifest" bên PORTAL-PM), không chạy
    // nền tự động để tránh gọi khi chưa cấu hình đủ taisan.* (application.yaml).
    @PostMapping("/sync-from-taisan")
    public ApiResponse<TaiSanSyncService.SyncResult> syncFromTaiSan() {
        return ApiResponse.success(taiSanSyncService.sync());
    }

    @GetMapping
    public ApiResponse<PageResponse<DeviceResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) DeviceGroup categoryGroup,
            @RequestParam(required = false) Long departmentId,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(deviceService.getAll(keyword, categoryName, categoryGroup, departmentId, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<DeviceResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(deviceService.getById(id));
    }

    @PostMapping
    public ApiResponse<DeviceResponse> create(@Valid @RequestBody DeviceRequest request) {
        return ApiResponse.success(deviceService.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<DeviceResponse>> bulkCreate(@Valid @RequestBody List<DeviceRequest> requests) {
        return ApiResponse.success(deviceService.bulkCreate(requests));
    }

    @PutMapping("/{id}")
    public ApiResponse<DeviceResponse> update(@PathVariable Long id, @Valid @RequestBody DeviceRequest request) {
        return ApiResponse.success(deviceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        deviceService.delete(id);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(deviceService.bulkDelete(request.getIds()));
    }
}
