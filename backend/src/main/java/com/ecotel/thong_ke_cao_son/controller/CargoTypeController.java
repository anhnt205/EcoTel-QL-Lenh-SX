package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.service.CargoTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cargo-types")
@RequiredArgsConstructor
public class CargoTypeController {

    private final CargoTypeService cargoTypeService;

    @GetMapping
    public ApiResponse<Page<CargoTypeResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            Pageable pageable) {
        return ApiResponse.success(cargoTypeService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<CargoTypeResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(cargoTypeService.getById(id));
    }
}
