package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.dto.response.ApiResponse;
import com.ecotel.thong_ke_cao_son.model.ProductionResult;
import com.ecotel.thong_ke_cao_son.model.SurveyCoefficient;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.SurveyCoefficientRepository;
import com.ecotel.thong_ke_cao_son.service.production.ProductionCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tính sản lượng và xem kết quả.
 *
 * <p>Tính theo KỲ, không theo chuyến: hệ số trắc địa phụ thuộc tổng của cả
 * kỳ nên kết quả một chuyến thay đổi khi chuyến khác cùng kỳ thay đổi.
 */
@RestController
@RequestMapping("/api/production")
@RequiredArgsConstructor
public class ProductionCalculationController {

    private final ProductionCalculationService service;
    private final ProductionResultRepository resultRepository;
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
        return ApiResponse.success(service.calculatePeriod(periodId, tkeMode));
    }

    /** Kết quả theo từng chuyến — nguồn của màn Báo cáo thống kê. */
    @GetMapping("/results")
    public ApiResponse<Page<ProductionResult>> results(
            @RequestParam Long periodId,
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(
                resultRepository.search(periodId, keyword, PageRequest.of(page, size)));
    }

    /** Bảng hệ số trắc địa hệ tự sinh (AP Tdia và Ap Tkm) của kỳ. */
    @GetMapping("/survey-coefficients")
    public ApiResponse<List<SurveyCoefficient>> coefficients(@RequestParam Long periodId) {
        return ApiResponse.success(
                coefficientRepository.findByReportPeriodIdOrderBySeamGroupExcavatorKeyAsc(periodId));
    }
}
