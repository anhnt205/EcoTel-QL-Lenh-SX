package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.dto.request.BulkDeleteRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReportPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReportPeriodUnlockRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodAuditResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodResponse;
import com.ecotel.thong_ke_cao_son.permission.AuthenticatedUser;
import com.ecotel.thong_ke_cao_son.permission.PermissionContext;
import com.ecotel.thong_ke_cao_son.service.ReportPeriodService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.nio.file.AccessDeniedException;
import java.util.List;

/** Danh mục Kỳ báo cáo (QĐ-05). */
@RestController
@RequestMapping("/api/report-periods")
@RequirePermission(resource = "report-periods")
@RequiredArgsConstructor
public class ReportPeriodController {

    private final ReportPeriodService service;
    private final PermissionContext permissionContext;

    @GetMapping
    public ApiResponse<PageResponse<ReportPeriodResponse>> getAll(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success(service.getAll(keyword, pageable));
    }

    /** Các kỳ của một tháng, đã sắp theo số kỳ — dùng cho combobox chọn kỳ. */
    @GetMapping("/by-month")
    public ApiResponse<List<ReportPeriodResponse>> getByMonth(
            @RequestParam int year, @RequestParam int month) {
        return ApiResponse.success(service.getByMonth(year, month));
    }

    @GetMapping("/{id}")
    public ApiResponse<ReportPeriodResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(service.getById(id));
    }

    @PostMapping
    public ApiResponse<ReportPeriodResponse> create(@Valid @RequestBody ReportPeriodRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping("/bulk")
    public ApiResponse<List<ReportPeriodResponse>> bulkCreate(
            @Valid @RequestBody List<ReportPeriodRequest> requests) {
        return ApiResponse.success(service.bulkCreate(requests));
    }

    /** Sinh nhanh kỳ cho một tháng theo mốc mặc định, rồi cho sửa lại. */
    @PostMapping("/generate")
    public ApiResponse<List<ReportPeriodResponse>> generate(
            @RequestParam int year, @RequestParam int month) {
        return ApiResponse.success(service.generateForMonth(year, month));
    }

    @PutMapping("/{id}")
    public ApiResponse<ReportPeriodResponse> update(
            @PathVariable Long id, @Valid @RequestBody ReportPeriodRequest request) {
        return ApiResponse.success(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/bulk")
    public ApiResponse<BulkDeleteResponse> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return ApiResponse.success(service.bulkDelete(request.getIds()));
    }

    // ── chốt / mở khoá (QĐ-03) ────────────────────────────────────────────

    /** Chốt kỳ. Cùng quyền "sửa" thông thường (POST → action "c" theo quy ước của lớp này). */
    @PostMapping("/{id}/lock")
    public ApiResponse<ReportPeriodResponse> lock(@PathVariable Long id, HttpServletRequest request) {
        AuthenticatedUser user = currentUser(request);
        return ApiResponse.success(service.lock(id, user.getUsername(), user.getFullName()));
    }

    /**
     * Mở khoá — QUYỀN RIÊNG, tách khỏi quyền "sửa" thông thường của lớp này
     * (action {@code "a"}, chỉ ADMIN — hệ thống chưa có vai trò "Thống kê"
     * riêng như QĐ-03 mô tả, ADMIN là vai trò gần nghĩa nhất hiện có). Bắt
     * buộc lý do trong {@link ReportPeriodUnlockRequest}.
     */
    @PostMapping("/{id}/unlock")
    @RequirePermission(resource = "report-periods", action = "a")
    public ApiResponse<ReportPeriodResponse> unlock(@PathVariable Long id,
            @Valid @RequestBody ReportPeriodUnlockRequest body, HttpServletRequest request) {
        AuthenticatedUser user = currentUser(request);
        return ApiResponse.success(service.unlock(id, body.getReason(), user.getUsername(), user.getFullName()));
    }

    /** Lịch sử chốt/mở khoá của một kỳ — mới nhất trước. */
    @GetMapping("/{id}/audits")
    public ApiResponse<List<ReportPeriodAuditResponse>> audits(@PathVariable Long id) {
        return ApiResponse.success(service.getAudits(id));
    }

    /**
     * {@link PermissionContext#getCurrentUser} khai {@code throws
     * AccessDeniedException} (checked) cho trường hợp chưa xác thực — trên
     * thực tế không bao giờ xảy ra tới được đây vì {@code PermissionFilter}
     * đã chặn request thiếu principal hợp lệ từ TRƯỚC khi controller chạy.
     * Bọc lại để chữ ký các endpoint trên không phải khai {@code throws}.
     */
    private AuthenticatedUser currentUser(HttpServletRequest request) {
        try {
            return permissionContext.getCurrentUser(request);
        } catch (AccessDeniedException e) {
            throw new IllegalStateException("Không xác định được người dùng hiện tại", e);
        }
    }
}
