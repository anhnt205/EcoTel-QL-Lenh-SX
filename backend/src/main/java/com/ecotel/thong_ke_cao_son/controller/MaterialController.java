package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MaterialResponse;
import com.ecotel.thong_ke_cao_son.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    @GetMapping
    public ApiResponse<Page<MaterialResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            Pageable pageable) {
        return ApiResponse.success(materialService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<MaterialResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(materialService.getById(id));
    }
}
