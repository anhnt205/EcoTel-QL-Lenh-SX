package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.AreaApplicationRowResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ProductionReportRowResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ProductionReportSummaryResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import com.ecotel.thong_ke_cao_son.repository.TransportReportTripRepository;
import com.ecotel.thong_ke_cao_son.service.SeamGroupExcavatorKeys;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** Đọc kết quả tính sản lượng cho màn "Báo cáo thống kê". */
@Service
@RequiredArgsConstructor
public class ProductionReportService {

    private final ProductionResultRepository resultRepository;
    private final ReportPeriodRepository periodRepository;
    private final TransportReportTripRepository tripRepository;
    private final AreaApplicationReportService areaApplicationReportService;

    @Transactional(readOnly = true)
    public PageResponse<ProductionReportRowResponse> getRows(Long periodId, String keyword, Pageable pageable) {
        Page<ProductionResult> page = resultRepository.search(periodId, keyword, pageable);
        return PageResponse.from(new PageImpl<>(toRows(page.getContent()), page.getPageable(), page.getTotalElements()));
    }

    /**
     * Dựng dòng báo cáo cho một danh sách kết quả. HSTĐ (m3/tấn/tkm) lấy từ báo cáo Áp Trắc địa của THÁNG chứa ngày
     * sản xuất (mỗi tháng gọi một lần) — đúng con số đang hiện ở màn Áp Trắc địa.
     */
    private List<ProductionReportRowResponse> toRows(List<ProductionResult> results) {
        Map<YearMonth, Map<String, AreaApplicationRowResponse>> areaByMonth = new HashMap<>();
        for (ProductionResult r : results) {
            if (r.getProductionDate() == null) continue;
            areaByMonth.computeIfAbsent(YearMonth.from(r.getProductionDate()), ym -> {
                Map<String, AreaApplicationRowResponse> byKey = new HashMap<>();
                for (AreaApplicationRowResponse a : areaApplicationReportService.getMonth(ym.getYear(), ym.getMonthValue(), null, null)) {
                    byKey.put(a.getSeamGroupExcavatorKey(), a);
                }
                return byKey;
            });
        }
        return results.stream().map(r -> toRow(r, areaByMonth)).toList();
    }

    /** Khối của Áp Trắc địa theo Sản phẩm nghiệm thu — cùng quy tắc chia khối với {@code AreaApplicationReportService}. */
    private static BigDecimal[] apHs(AreaApplicationRowResponse a, String product) {
        if (a == null) return new BigDecimal[]{null, null, null};
        if ("Dat_CN".equalsIgnoreCase(product)) return new BigDecimal[]{a.getEarthCnHsM3(), a.getEarthCnHsTon(), a.getEarthCnHsTkm()};
        if (ProductionKeys.isCoal(product)) return new BigDecimal[]{a.getCoalHsM3(), a.getCoalHsTon(), a.getCoalHsTkm()};
        return new BigDecimal[]{a.getEarthSxHsM3(), a.getEarthSxHsTon(), a.getEarthSxHsTkm()};
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
                    .build();
        }

        // Mỗi chuyến đã tính có đúng 1 dòng kết quả -> phần còn lại của kỳ là chuyến
        // bị bỏ qua vì chưa duyệt (QĐ-25), cần hiện rõ để không ai đọc nhầm là đủ.
        long totalTrips = tripRepository.countByReportDateBetween(period.getFromDate(), period.getToDate());

        ProductionResult first = all.get(0);
        return b.calculatedAt(first.getCalculatedAt())
                .unapprovedTripCount(Math.max(0L, totalTrips - all.size()))
                .totalM3(sum(all, ProductionResult::getTotalM3))
                .totalTon(sum(all, ProductionResult::getTotalTon))
                .totalTkm(sum(all, ProductionResult::getTotalTkm))
                .surveyM3(sum(all, ProductionResult::getSurveyM3))
                .surveyTon(sum(all, ProductionResult::getSurveyTon))
                .surveyTkm(sum(all, ProductionResult::getSurveyTkm))
                .build();
    }

    /** Toàn bộ dòng của kỳ, không phân trang — dùng khi xuất Excel. */
    @Transactional(readOnly = true)
    public List<ProductionReportRowResponse> getAllRows(Long periodId) {
        return toRows(resultRepository.findAllByPeriod(periodId));
    }

    /** Dòng thống kê trong khoảng ngày sản xuất, không theo kỳ — màn xem Báo cáo thống kê. */
    @Transactional(readOnly = true)
    public List<ProductionReportRowResponse> getRowsByDate(java.time.LocalDate from, java.time.LocalDate to) {
        return toRows(resultRepository.findAllByProductionDateBetween(from, to));
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private ProductionReportRowResponse toRow(ProductionResult r, Map<YearMonth, Map<String, AreaApplicationRowResponse>> areaByMonth) {
        TransportReportTrip trip = r.getTransportTrip();
        TransportReport report = trip != null ? trip.getTransportReport() : null;
        Device vehicle = report != null ? report.getVehicle() : null;
        Device excavator = trip != null ? trip.getExcavator() : null;
        // HSTĐ lấy từ báo cáo Áp Trắc địa của tháng, đúng khoá (Nhóm vỉa + Máy xúc) và đúng khối (Đất CN / Đất SX / Than SX)
        Map<String, AreaApplicationRowResponse> monthAreas = r.getProductionDate() == null ? null
                : areaByMonth.get(YearMonth.from(r.getProductionDate()));
        BigDecimal[] ap = apHs(monthAreas == null ? null : monthAreas.get(r.getSeamGroupExcavatorKey()), r.getAcceptanceProduct());

        return ProductionReportRowResponse.builder()
                .apHsM3(ap[0])
                .apHsTon(ap[1])
                .apHsTkm(ap[2])
                .receivingFloor(trip != null ? trip.getReceivingFloor() : null)
                .unloadingFloor(trip != null ? emptyToNull(trip.getUnloadingFloor()) : null)
                .routeLiftM(trip != null && trip.getTotalRouteLiftM() != null ? BigDecimal.valueOf(trip.getTotalRouteLiftM()) : null)
                .localSlopeDistanceKm(trip != null && trip.getLocalSlopeDistanceKm() != null
                        ? BigDecimal.valueOf(trip.getLocalSlopeDistanceKm()) : null)
                .weighedWeightTon(trip != null ? trip.getWeighedWeightTon() : null)
                .provisionalModel(trip != null ? trip.getProvisionalModel() : null)
                .provisionalDensity(trip != null ? trip.getProvisionalDensity() : null)
                .deductionAmount(trip != null ? trip.getDeductionAmount() : null)
                // Cùng hàm engine dùng khi tính than CTNB (0/trống → 1).
                .ctnbFactor(trip != null ? ProductionCalculationService.ctnbFactor(trip) : null)
                // Cùng hàm engine dùng để nội suy ĐMNL — một nguồn công thức duy nhất, không chép lại lần hai.
                .fuelPaymentLift(trip != null ? FuelCalculator.fuelPaymentLift(trip) : null)
                .rainyDay(trip != null && Boolean.TRUE.equals(trip.getRainyDay()))
                .supplementaryVehicle(trip != null && Boolean.TRUE.equals(trip.getSupplementaryVehicle()))
                .loadLevel(loadLevelLabel(trip))
                // SPNT/CN = Sản phẩm nghiệm thu gán cho chủng loại hàng của chuyến (danh mục Chủng loại hàng)
                .cargoSpntCn(trip != null && trip.getCargoType() != null && trip.getCargoType().getAcceptanceProduct() != null
                        ? trip.getCargoType().getAcceptanceProduct().getName() : null)
                .vehicleNumber(vehicle != null ? emptyToNull(vehicle.getVehicleNumber()) : null)
                .vehicleCarRenovation(vehicle != null ? emptyToNull(vehicle.getCarRenovation()) : null)
                .vehicleTypeName(vehicle != null && vehicle.getVehicleType() != null ? vehicle.getVehicleType().getName() : null)
                .vehicleCategoryClassName(vehicle != null && vehicle.getCategoryClass() != null ? vehicle.getCategoryClass().getName() : null)
                .vehicleRankName(vehicle != null && vehicle.getVehicleRank() != null ? vehicle.getVehicleRank().getCode() : null)
                .vehicleRankGroupName(vehicle != null && vehicle.getVehicleRank() != null && vehicle.getVehicleRank().getVehicleRankGroup() != null
                        ? vehicle.getVehicleRank().getVehicleRankGroup().getName() : null)
                .vehicleDepartmentName(vehicle != null && vehicle.getDepartment() != null ? vehicle.getDepartment().getName() : null)
                .vehicleFuelClassName(vehicle != null && vehicle.getFuelClass() != null ? vehicle.getFuelClass().getName() : null)
                .vehicleTypeRankGroupKey(emptyToNull(vehicleTypeRankGroupKeyOf(vehicle)))
                .vehicleFuelNormKey(emptyToNull(vehicleFuelNormKeyOf(vehicle, trip, r.getAcceptanceProduct())))
                .excavatorNumber(excavator != null ? emptyToNull(excavator.getVehicleNumber()) : null)
                .excavatorTypeName(excavator != null && excavator.getCategory() != null ? excavator.getCategory().getName() : null)
                .excavatorRankName(excavator != null && excavator.getVehicleRank() != null ? excavator.getVehicleRank().getCode() : null)
                .excavatorBucketName(excavator != null && excavator.getBucket() != null ? excavator.getBucket().getName() : null)
                .excavatorDepartmentName(excavator != null && excavator.getDepartment() != null ? excavator.getDepartment().getName() : null)
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
                // Nhóm chủng loại hàng theo CHỦNG LOẠI HÀNG của chuyến (nhóm gán trong danh mục Chủng loại hàng),
                // không theo ô nhóm hàng nhập riêng trên chuyến.
                .cargoGroupName(trip != null && trip.getCargoType() != null && trip.getCargoType().getCargoGroup() != null
                        ? trip.getCargoType().getCargoGroup().getName() : null)
                .tripCount(trip != null ? trip.getTripCount() : null)
                .routeDistanceKm(trip != null && trip.getTotalRouteDistanceKm() != null
                        ? BigDecimal.valueOf(trip.getTotalRouteDistanceKm()) : null)
                .seamGroupName(seamGroupOf(trip))
                .benchGroup(trip != null && trip.getReceivingFloorGroup() != null
                        ? String.valueOf(trip.getReceivingFloorGroup()) : null)
                // Cùng hàm dựng khoá ở TripBaseCalculator.buildKey — không suy diễn quy tắc thứ hai.
                .mudMark(trip != null && trip.getCargoType() != null
                        ? emptyToNull(SeamGroupExcavatorKeys.mudMark(trip.getCargoType().getName())) : null)
                .seamGroupExcavatorKey(r.getSeamGroupExcavatorKey())
                .acceptanceProduct(r.getAcceptanceProduct())
                .totalM3(r.getTotalM3())
                .totalTon(r.getTotalTon())
                .totalTkm(r.getTotalTkm())
                .surveyM3(r.getSurveyM3())
                .surveyTon(r.getSurveyTon())
                .surveyTkm(r.getSurveyTkm())
                .densityUsed(r.getDensityUsed())
                .modelUsed(r.getModelUsed())
                .bulkDensityUsed(r.getBulkDensityUsed())
                .hsM3(r.getHsM3())
                .hsTon(r.getHsTon())
                .hsTkm(r.getHsTkm())
                .densityOriginal(r.getDensityOriginal())
                .densityNoMoisture(r.getDensityNoMoisture())
                .totalM3Original(r.getTotalM3Original())
                .totalTonNoMoisture(r.getTotalTonNoMoisture())
                .totalTkmNoMoisture(r.getTotalTkmNoMoisture())
                .wasteRockTon(r.getWasteRockTon())
                .wasteRockM3(r.getWasteRockM3())
                .totalTonOriginalBeforeWaste(r.getTotalTonOriginalBeforeWaste())
                // Tổng km vận chuyển = Cung độ toàn tuyến × Số chuyến
                .totalKmTransport(trip != null && trip.getTotalRouteDistanceKm() != null && trip.getTripCount() != null
                        ? BigDecimal.valueOf(trip.getTotalRouteDistanceKm()).multiply(BigDecimal.valueOf(trip.getTripCount())) : null)
                .cargoCode(r.getCargoCode())
                .cargoTtlCode(r.getCargoTtlCode())
                .seamKpmb(r.getSeamKpmb())
                .fuelHb(r.getFuelHb())
                .fuelHa(r.getFuelHa())
                .fuelH1(r.getFuelH1())
                .fuelH2(r.getFuelH2())
                .fuelNbH1(r.getFuelNbH1())
                .fuelNbH2(r.getFuelNbH2())
                .fuelNb(r.getFuelNb())
                .fuelNaH1(r.getFuelNaH1())
                .fuelNaH2(r.getFuelNaH2())
                .fuelNa(r.getFuelNa())
                .fuelNt(r.getFuelNt())
                .fuelNormSeasonal(r.getFuelNormSeasonal())
                .fuelNormVehicleClass(r.getFuelNormVehicleClass())
                .fuelNormCarRenovation(r.getFuelNormCarRenovation())
                .fuelCoalCnNkFactor(r.getFuelCoalCnNkFactor())
                .bsnlRoda(r.getBsnlRoda())
                .bsnlRainyDay(r.getBsnlRainyDay())
                .bsnlSupplementary(r.getBsnlSupplementary())
                .bsnlMaintenance(r.getBsnlMaintenance())
                .bsnlOther(r.getBsnlOther())
                .bsnlSpnt(r.getBsnlSpnt())
                .bsnlMud(r.getBsnlMud())
                .fuelNorm(r.getFuelNorm())
                .fuelBaseConsumption(r.getFuelBaseConsumption())
                .fuelTotalBeforeAdjustment(r.getFuelTotalBeforeAdjustment())
                .fuelCurrentNorm(r.getFuelCurrentNorm())
                .productivityNorm(r.getProductivityNorm())
                .build();
    }

    /** Chủng loại xe + Nhóm hạng xe của xe (vd HM400-2R_C). */
    static String vehicleTypeRankGroupKeyOf(Device vehicle) {
        if (vehicle == null || vehicle.getVehicleType() == null) return null;
        String group = vehicle.getVehicleRank() != null && vehicle.getVehicleRank().getVehicleRankGroup() != null
                ? vehicle.getVehicleRank().getVehicleRankGroup().getCode() : null;
        return ProductionKeys.vehicleTypeRankGroupKey(vehicle.getVehicleType().getCode(), group);
    }

    /**
     * Chủng loại xe + ĐMNL: gốc là Chủng loại xe, hậu tố rẽ nhánh theo (Chủng loại xe + Nhóm hạng xe, chủng loại hàng,
     * nơi dỡ tải, SPNT, phân loại) — cùng hàm rẽ nhánh engine nhiên liệu đã dùng và đối soát với Excel
     * ({@link ProductionKeys#fuelNormVehicleKey}). CHỈ để hiển thị; việc tra định mức nhiên liệu không đổi.
     */
    static String vehicleFuelNormKeyOf(Device vehicle, TransportReportTrip trip, String acceptanceProduct) {
        if (vehicle == null || vehicle.getVehicleType() == null) return null;
        return ProductionKeys.fuelNormVehicleKey(
                vehicle.getVehicleType().getCode(),
                vehicleTypeRankGroupKeyOf(vehicle),
                trip != null && trip.getCargoType() != null ? trip.getCargoType().getName() : null,
                trip != null && trip.getUnloadingPoint() != null ? trip.getUnloadingPoint().getName() : null,
                acceptanceProduct,
                ProductionKeys.classify(acceptanceProduct));
    }

    /** Nhóm vỉa của điểm nhận tải — hiện TÊN như màn STD (khoá dùng mã), thiếu tên thì lùi về mã. */
    private static String seamGroupOf(TransportReportTrip trip) {
        SeamGroup g = trip != null && trip.getLoadingPoint() != null ? trip.getLoadingPoint().getSeamGroup() : null;
        if (g == null) return null;
        return g.getName() != null && !g.getName().isBlank() ? g.getName() : g.getCode();
    }

    /** Mức tải hiển thị như Báo chuyến / file Excel: Đủ tải, Roda (2/3), hoặc giá trị x/y tự nhập. */
    private static String loadLevelLabel(TransportReportTrip trip) {
        LoadLevel level = trip != null ? trip.getLoadLevel() : null;
        if (level == null || level.getType() == null) return null;
        return switch (level.getType()) {
            case FULL_LOAD -> "Đủ tải";
            case RODA_2_3 -> "Roda (2/3)";
            case OTHER -> emptyToNull(level.getCustomValue());
        };
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s;
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
