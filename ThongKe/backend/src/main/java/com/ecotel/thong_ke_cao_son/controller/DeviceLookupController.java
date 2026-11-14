package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.model.DeviceModel;
import com.ecotel.thong_ke_cao_son.model.DeviceType;
import com.ecotel.thong_ke_cao_son.repository.DeviceModelRepository;
import com.ecotel.thong_ke_cao_son.repository.DeviceTypeRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Danh sách chọn cho biểu mẫu Xe / Máy: Loại thiết bị (lọc theo nhóm XE/MAY) và Chủng loại (mẫu thiết bị).
 * Chỉ đọc; dùng chung quyền {@code devices}.
 */
@RestController
@RequestMapping("/api")
@RequirePermission(resource = "devices")
@RequiredArgsConstructor
public class DeviceLookupController {

    private final DeviceTypeRepository deviceTypeRepository;
    private final DeviceModelRepository deviceModelRepository;

    @Getter
    @Builder
    public static class LookupItem {
        private Long id;
        private String code;
        private String name;
        private String group;
    }

    @GetMapping("/device-types")
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<LookupItem>> deviceTypes(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) DeviceGroup group,
            @RequestParam(required = false, defaultValue = "200") int size) {
        var items = deviceTypeRepository.search(keyword, Pageable.unpaged())
                .getContent().stream()
                .filter((DeviceType t) -> group == null || t.getGroup() == group)
                .map((DeviceType t) -> LookupItem.builder()
                        .id(t.getId()).code(t.getCode()).name(t.getName())
                        .group(t.getGroup() == null ? null : t.getGroup().name()).build())
                .sorted((a, b) -> String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName())))
                .toList();
        return ApiResponse.success(page(items));
    }

    @GetMapping("/device-models")
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<LookupItem>> deviceModels(
            @RequestParam(required = false, defaultValue = "") String keyword) {
        var items = deviceModelRepository.search(keyword, Pageable.unpaged())
                .getContent().stream()
                .map((DeviceModel m) -> LookupItem.builder().id(m.getId()).code(m.getCode()).name(m.getName()).build())
                .sorted((a, b) -> String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName())))
                .toList();
        return ApiResponse.success(page(items));
    }

    private static PageResponse<LookupItem> page(java.util.List<LookupItem> items) {
        return PageResponse.<LookupItem>builder()
                .content(items).page(0).size(items.size()).totalElements(items.size()).totalPages(1).last(true).build();
    }
}
