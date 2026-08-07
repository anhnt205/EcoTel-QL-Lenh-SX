package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.CargoTypeService;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cargo-types")
@RequiredArgsConstructor
public class CargoTypeController {

    private final CargoTypeService cargoTypeService;

    @GetMapping
    public ApiResponse<PageResponse<CargoTypeResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(cargoTypeService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<CargoTypeResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(cargoTypeService.getById(id));
    }
}
