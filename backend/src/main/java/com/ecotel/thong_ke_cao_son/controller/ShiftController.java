package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ShiftResponse;
import com.ecotel.thong_ke_cao_son.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    @GetMapping
    public ApiResponse<Page<ShiftResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            Pageable pageable) {
        return ApiResponse.success(shiftService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ShiftResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(shiftService.getById(id));
    }
}
