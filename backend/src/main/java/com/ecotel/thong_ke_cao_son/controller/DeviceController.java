package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DeviceResponse;
import com.ecotel.thong_ke_cao_son.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    public ApiResponse<Page<DeviceResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            Pageable pageable) {
        return ApiResponse.success(deviceService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<DeviceResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(deviceService.getById(id));
    }
}
