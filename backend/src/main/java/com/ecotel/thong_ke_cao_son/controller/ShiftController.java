package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ShiftResponse;
import com.ecotel.thong_ke_cao_son.service.ShiftService;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shifts")
@RequirePermission(resource = "shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    // Sắp TĂNG dần: Ca 1 → Ca 2 → Ca 3 → Ca 4. Trước đây để DESC nên API trả
    // ngược (Ca 4 đứng đầu); form nhập liệu Vận tải lấy phần tử ĐẦU TIÊN làm
    // Ca mặc định nên tự điền sẵn "Ca 4" — người nhập không để ý là lưu sai Ca,
    // khiến chuyến Vận tải và Khai thác của CÙNG một ca không ghép cặp được ở
    // màn Đối chiếu (khoá ghép gồm Ca). Chốt 2026-09-09.
    @GetMapping
    public ApiResponse<PageResponse<ShiftResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.ASC) Pageable pageable) {
        return ApiResponse.success(shiftService.getAll(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ShiftResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(shiftService.getById(id));
    }
}
