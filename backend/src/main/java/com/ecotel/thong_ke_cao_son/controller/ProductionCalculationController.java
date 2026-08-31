package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.model.SurveyCoefficient;
import com.ecotel.thong_ke_cao_son.repository.SurveyCoefficientRepository;
import com.ecotel.thong_ke_cao_son.service.production.ProductionCalculationService;
import com.ecotel.thong_ke_cao_son.service.production.ProductionReportService;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tính sản lượng và màn "Báo cáo thống kê".
 *
 * <p>Tính theo KỲ, không theo chuyến: hệ số trắc địa phụ thuộc tổng của cả
 * kỳ, nên kết quả một chuyến thay đổi khi chuyến khác cùng kỳ thay đổi.
 */
@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
public class ProductionCalculationController {

    private final ProductionCalculationService calculationService;
    private final ProductionReportService reportService;
    private final SurveyCoefficientRepository coefficientRepository;

    /**
     * Tính lại toàn bộ một kỳ. Xoá kết quả cũ của kỳ trước khi tính.
     *
     * @param tkeMode chế độ Thống kê (QĐ-03) — bỏ qua hệ số trắc địa
     */
    @PostMapping("/calculate")
    public ApiResponse<ProductionCalculationService.CalculationSummary> calculate(
            @RequestParam Long periodId,
            @RequestParam(defaultValue = "false") boolean tkeMode) {
        return ApiResponse.success(calculationService.calculatePeriod(periodId, tkeMode));
    }

    /** Phần đầu màn báo cáo: kỳ, thời điểm tính, và các tổng cộng của cả kỳ. */
    @GetMapping("/summary")
    public ApiResponse<ProductionReportSummaryResponse> summary(@RequestParam Long periodId) {
        return ApiResponse.success(reportService.getSummary(periodId));
    }

    /** Bảng kết quả theo từng chuyến — thân của màn Báo cáo thống kê. */
    @GetMapping("/results")
    public ApiResponse<PageResponse<ProductionReportRowResponse>> results(
            @RequestParam Long periodId,
            @RequestParam(required = false, defaultValue = "") String keyword,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(reportService.getRows(periodId, keyword, pageable));
    }

    /** Toàn bộ dòng của kỳ, không phân trang — dùng khi xuất Excel. */
    @GetMapping("/results/all")
    public ApiResponse<List<ProductionReportRowResponse>> allResults(@RequestParam Long periodId) {
        return ApiResponse.success(reportService.getAllRows(periodId));
    }

    /** Bảng hệ số trắc địa hệ tự sinh (AP Tdia và Ap Tkm) của kỳ. */
    @GetMapping("/survey-coefficients")
    public ApiResponse<List<SurveyCoefficient>> coefficients(@RequestParam Long periodId) {
        return ApiResponse.success(
                coefficientRepository.findByReportPeriodIdOrderBySeamGroupExcavatorKeyAsc(periodId));
    }
}
