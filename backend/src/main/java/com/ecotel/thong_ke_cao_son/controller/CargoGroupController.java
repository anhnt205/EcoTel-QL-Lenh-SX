package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoGroupResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.service.CargoGroupService;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cargo-groups")
@RequiredArgsConstructor
public class CargoGroupController {

    private final CargoGroupService cargoGroupService;

    @GetMapping
    public ApiResponse<PageResponse<CargoGroupResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(cargoGroupService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<CargoGroupResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(cargoGroupService.getById(id));
    }
}
