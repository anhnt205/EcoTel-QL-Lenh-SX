package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.LocationResponse;
import com.ecotel.thong_ke_cao_son.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public ApiResponse<Page<LocationResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            Pageable pageable) {
        return ApiResponse.success(locationService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<LocationResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(locationService.getById(id));
    }
}
