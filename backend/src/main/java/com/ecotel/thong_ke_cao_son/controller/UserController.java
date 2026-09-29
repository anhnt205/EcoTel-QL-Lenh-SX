package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.UserAccountCreateRequest;
import com.ecotel.thong_ke_cao_son.dto.request.UserAccountUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.UserResponse;
import com.ecotel.thong_ke_cao_son.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequirePermission(resource = "users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ApiResponse<PageResponse<UserResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) Long departmentId,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(userService.getAll(keyword, departmentId, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(userService.getById(id));
    }

    @PostMapping
    public ApiResponse<UserResponse> create(@Valid @RequestBody UserAccountCreateRequest request) {
        return ApiResponse.success(userService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(
            @PathVariable Long id, @Valid @RequestBody UserAccountUpdateRequest request) {
        return ApiResponse.success(userService.update(id, request));
    }
}
