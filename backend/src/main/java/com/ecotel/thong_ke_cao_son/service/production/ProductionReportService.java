package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ProductionReportRowResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ProductionReportSummaryResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.function.Function;

/** Đọc kết quả tính sản lượng cho màn "Báo cáo thống kê". */
@Service
@RequiredArgsConstructor
public class ProductionReportService {

    private final ProductionResultRepository resultRepository;
    private final ReportPeriodRepository periodRepository;

    @Transactional(readOnly = true)
    public PageResponse<ProductionReportRowResponse> getRows(Long periodId, String keyword, Pageable pageable) {
        return PageResponse.from(
                resultRepository.search(periodId, keyword, pageable).map(this::toRow));
    }

    /**
     * Phần tổng của kỳ.
     *
     * <p>Cộng trên TOÀN BỘ kỳ, không phải trên trang đang xem — tổng của một
     * trang không có ý nghĩa nghiệp vụ nào.
     */
    @Transactional(readOnly = true)
    public ProductionReportSummaryResponse getSummary(Long periodId) {
        ReportPeriod period = periodRepository.findById(periodId).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy kỳ báo cáo id: " + periodId));

        List<ProductionResult> all = resultRepository.findAllByPeriod(periodId);

        ProductionReportSummaryResponse.ProductionReportSummaryResponseBuilder b =
                ProductionReportSummaryResponse.builder()
                        .periodId(period.getId())
                        .periodName(period.getDisplayName())
                        .fromDate(period.getFromDate())
                        .toDate(period.getToDate())
                        .dayCount(period.getDayCount())
                        .rowCount(all.size());

        if (all.isEmpty()) {
            // Kỳ chưa tính lần nào: trả tổng bằng 0 kèm rowCount = 0 để giao
            // diện phân biệt được "chưa tính" với "đã tính và ra 0".
            return b.totalM3(BigDecimal.ZERO).totalTon(BigDecimal.ZERO).totalTkm(BigDecimal.ZERO)
                    .surveyM3(BigDecimal.ZERO).surveyTon(BigDecimal.ZERO).surveyTkm(BigDecimal.ZERO)
                    .finalTon(BigDecimal.ZERO).finalTkm(BigDecimal.ZERO)
                    .build();
        }

        ProductionResult first = all.get(0);
        return b.calculatedAt(first.getCalculatedAt())
                .tkeMode(first.isTkeMode())
                .totalM3(sum(all, ProductionResult::getTotalM3))
                .totalTon(sum(all, ProductionResult::getTotalTon))
                .totalTkm(sum(all, ProductionResult::getTotalTkm))
                .surveyM3(sum(all, ProductionResult::getSurveyM3))
                .surveyTon(sum(all, ProductionResult::getSurveyTon))
                .surveyTkm(sum(all, ProductionResult::getSurveyTkm))
                .finalTon(sum(all, ProductionResult::getFinalTon))
                .finalTkm(sum(all, ProductionResult::getFinalTkm))
                .build();
    }

    /** Toàn bộ dòng của kỳ, không phân trang — dùng khi xuất Excel. */
    @Transactional(readOnly = true)
    public List<ProductionReportRowResponse> getAllRows(Long periodId) {
        return resultRepository.findAllByPeriod(periodId).stream().map(this::toRow).toList();
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private ProductionReportRowResponse toRow(ProductionResult r) {
        TransportReportTrip trip = r.getTransportTrip();
        TransportReport report = trip != null ? trip.getTransportReport() : null;

        return ProductionReportRowResponse.builder()
                .id(r.getId())
                .transportTripId(trip != null ? trip.getId() : null)
                .productionDate(r.getProductionDate())
                // Ca lưu dạng SỐ trong `shifts.name`; báo cáo hiện dạng chữ.
                .shiftName(report != null && report.getShift() != null && report.getShift().getName() != null
                        ? String.valueOf(report.getShift().getName()) : null)
                .vehicleCode(report != null && report.getVehicle() != null ? report.getVehicle().getCode() : null)
                .excavatorCode(trip != null && trip.getExcavator() != null ? trip.getExcavator().getCode() : null)
                .excavationAreaName(nameOfArea(trip))
                .loadingPointName(trip != null && trip.getLoadingPoint() != null ? trip.getLoadingPoint().getName() : null)
                .unloadingPointName(trip != null && trip.getUnloadingPoint() != null ? trip.getUnloadingPoint().getName() : null)
                .cargoTypeName(trip != null && trip.getCargoType() != null ? trip.getCargoType().getName() : null)
                .cargoGroupName(trip != null && trip.getCargoGroup() != null ? trip.getCargoGroup().getName() : null)
                .tripCount(trip != null ? trip.getTripCount() : null)
                .routeDistanceKm(trip != null && trip.getTotalRouteDistanceKm() != null
                        ? BigDecimal.valueOf(trip.getTotalRouteDistanceKm()) : null)
                .seamGroupExcavatorKey(r.getSeamGroupExcavatorKey())
                .acceptanceProduct(r.getAcceptanceProduct())
                .totalM3(r.getTotalM3())
                .totalTon(r.getTotalTon())
                .totalTkm(r.getTotalTkm())
                .surveyM3(r.getSurveyM3())
                .surveyTon(r.getSurveyTon())
                .surveyTkm(r.getSurveyTkm())
                .finalTon(r.getFinalTon())
                .finalTkm(r.getFinalTkm())
                .densityUsed(r.getDensityUsed())
                .modelUsed(r.getModelUsed())
                .bulkDensityUsed(r.getBulkDensityUsed())
                .hsM3(r.getHsM3())
                .hsTon(r.getHsTon())
                .hsTkm(r.getHsTkm())
                .tkeMode(r.isTkeMode())
                .cargoCode(r.getCargoCode())
                .cargoTtlCode(r.getCargoTtlCode())
                .seamKpmb(r.getSeamKpmb())
                .fuelNorm(r.getFuelNorm())
                .fuelBaseConsumption(r.getFuelBaseConsumption())
                .fuelTotalBeforeAdjustment(r.getFuelTotalBeforeAdjustment())
                .fuelCurrentNorm(r.getFuelCurrentNorm())
                .productivityNorm(r.getProductivityNorm())
                .build();
    }

    private static String nameOfArea(TransportReportTrip trip) {
        ExcavationArea area = trip != null ? trip.getExcavationArea() : null;
        return area != null ? area.getName() : null;
    }

    private static BigDecimal sum(List<ProductionResult> rows, Function<ProductionResult, BigDecimal> f) {
        return rows.stream().map(f).filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
