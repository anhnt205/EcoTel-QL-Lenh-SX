package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.CoefficientItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Nhánh NHIÊN LIỆU và NĂNG SUẤT — các cột {@code AZ}…{@code BR} của bảng tính.
 *
 * <p>Chuỗi 11 bước, đọc từ docx dòng 326–440 và đối chiếu công thức thật:
 *
 * <pre>
 * AZ  nội suy ĐMNL trên lưới DMNL           (FuelNormInterpolator)
 * BA  × hệ số mùa            tháng 6–9 → 1,03; còn lại 1
 * BC  × hệ số hạng xe        A 0,97 · B 1 · C1 1,04 · khác 1,06
 * BD  × hệ số cải tạo toa    CaiToa → 1,03
 * BE  HS Than (CN-NK)        xét theo thứ tự, thoả điều kiện nào thì dừng
 * BF  = BD × BE
 * BG  Nhiên liệu theo ĐM (lít) = Tổng Tkm × BF / 1000
 * BH…BO  tám khoản bù, mỗi khoản là một tỷ lệ của BG
 * BP  = BG + tám khoản bù
 * BQ  = BP × HS điều chỉnh NLĐM
 * BR  Định mức năng suất xe tải
 * </pre>
 *
 * <p><b>Không chặn phép tính sản lượng.</b> Thiếu lưới DMNL hay HS điều chỉnh
 * thì nhánh này bỏ trống và ghi cảnh báo — sản lượng (m3/tấn/tkm) vẫn tính
 * được mà không cần nhiên liệu, nên ném lỗi ở đây sẽ làm hỏng luôn phần vốn
 * chạy đúng.
 */
@Component
@RequiredArgsConstructor
public class FuelCalculator {

    private static final String MATRIX_DMNL = "DMNL";
    private static final String MATRIX_NANG_SUAT = "NANG_SUAT_XE";
    private static final String MATRIX_HS_DIEU_CHINH = "HS_DIEU_CHINH_NLDM";

    /** Mã hệ số bùn trong danh mục Hệ số — ô $BN$2 của bảng tính. */
    private static final String COEFFICIENT_MUD = "HS.BUN";

    private static final BigDecimal THOUSAND = new BigDecimal("1000");
    private static final BigDecimal MAX_DISTANCE_FOR_PRODUCTIVITY = new BigDecimal("8");

    private final CoefficientItemRepository coefficientRepository;

    /**
     * @param grids  ba lưới đã nạp sẵn (DMNL, NANG_SUAT_XE, HS_DIEU_CHINH_NLDM);
     *               nạp một lần cho cả kỳ thay vì mỗi chuyến một lần
     */
    public FuelResult calculate(TransportReportTrip trip, TripBaseResult base,
                                java.util.Map<String, MatrixGridResponse> grids) {
        List<String> warnings = new ArrayList<>();
        FuelResult.FuelResultBuilder out = FuelResult.builder();

        Device vehicle = trip.getTransportReport() != null
                ? trip.getTransportReport().getVehicle() : null;
        if (vehicle == null || vehicle.getFuelClass() == null) {
            warnings.add("Chuyến id=" + trip.getId()
                    + ": chưa khai Chủng loại xe + DMNL nên bỏ qua nhánh nhiên liệu.");
            return out.warnings(warnings).build();
        }

        String areaCode = trip.getExcavationArea() != null ? trip.getExcavationArea().getCode() : null;
        String fuelClassKey = ProductionKeys.vehicleFuelClassKey(vehicle.getFuelClass().getCode(), areaCode);
        String classification = ProductionKeys.classify(base.getAcceptanceProduct());

        BigDecimal routeDistance = decimal(trip.getTotalRouteDistanceKm());
        BigDecimal liftHeight = decimal(trip.getTotalRouteLiftM());

        // ── AZ: nội suy ĐMNL ────────────────────────────────────────────────
        MatrixGridResponse dmnl = grids.get(MATRIX_DMNL);
        Optional<FuelNormInterpolator.Result> interpolated = dmnl == null
                ? Optional.empty()
                : FuelNormInterpolator.interpolate(dmnl, fuelClassKey, routeDistance, liftHeight);
        if (interpolated.isEmpty()) {
            warnings.add("Chuyến id=" + trip.getId() + ": lưới Định mức nhiên liệu chưa có dữ liệu cho cột \""
                    + fuelClassKey + "\" nên bỏ qua nhánh nhiên liệu.");
            return out.warnings(warnings).build();
        }
        BigDecimal az = interpolated.get().value();
        out.normInterpolated(az);

        // ── BA…BF: bốn hệ số nhân liên tiếp ─────────────────────────────────
        BigDecimal ba = az.multiply(seasonFactor(base));
        BigDecimal bc = ba.multiply(vehicleClassFactor(vehicle));
        BigDecimal bd = bc.multiply(carRenovationFactor(vehicle));
        BigDecimal be = coalCnNkFactor(trip, vehicle, base);
        BigDecimal bf = bd.multiply(be);

        out.normSeasonal(scale(ba)).normVehicleClass(scale(bc))
           .normCarRenovation(scale(bd)).coalCnNkFactor(be).normFinal(scale(bf));

        // ── BG: nhiên liệu theo định mức ────────────────────────────────────
        BigDecimal bg = base.getTotalTkm().multiply(bf)
                .divide(THOUSAND, 6, RoundingMode.HALF_UP);
        out.baseConsumption(bg);

        // ── BH…BO: tám khoản bù ─────────────────────────────────────────────
        BigDecimal bh = pct(bg, isRoda(trip) ? new BigDecimal("0.5") : BigDecimal.ZERO);
        BigDecimal bi = pct(bg, Boolean.TRUE.equals(trip.getRainyDay()) ? new BigDecimal("0.05") : BigDecimal.ZERO);
        BigDecimal bj = pct(bg, Boolean.TRUE.equals(trip.getSupplementaryVehicle()) ? new BigDecimal("0.04") : BigDecimal.ZERO);
        BigDecimal bk = pct(bg, maintenanceRate(fuelClassKey));
        BigDecimal bl = pct(bg, isVehicle965(vehicle) ? new BigDecimal("0.05") : BigDecimal.ZERO);
        BigDecimal bm = pct(bg, spntRate(trip, vehicle));
        BigDecimal bn = pct(bg, mudRate(trip, vehicle, warnings));
        // BO — "BSNL_Spnt__CN (xe)": bảng tính có TIÊU ĐỀ nhưng KHÔNG có công
        // thức, ô để trống. Chưa có quy tắc nên để 0 và không đoán.
        BigDecimal bo = BigDecimal.ZERO;

        out.bsnlRoda(bh).bsnlRainyDay(bi).bsnlSupplementary(bj).bsnlMaintenance(bk)
           .bsnlOther(bl).bsnlSpnt(bm).bsnlMud(bn).bsnlSpntCn(bo);

        BigDecimal bp = bg.add(bh).add(bi).add(bj).add(bk).add(bl).add(bm).add(bn).add(bo);
        out.totalBeforeAdjustment(scale(bp));

        // ── BQ: × HS điều chỉnh NLĐM ────────────────────────────────────────
        BigDecimal ec = adjustmentFactor(grids.get(MATRIX_HS_DIEU_CHINH), vehicle,
                classification, areaCode, trip, warnings);
        out.adjustmentFactor(ec);
        if (ec != null) {
            out.currentNorm(scale(bp.multiply(ec)));
        }

        // ── BR: định mức năng suất ──────────────────────────────────────────
        out.productivityNorm(productivityNorm(grids.get(MATRIX_NANG_SUAT), trip,
                vehicle, classification, routeDistance, warnings));

        return out.warnings(warnings).build();
    }

    // ── các hệ số ───────────────────────────────────────────────────────────

    /** BA5 — tháng 6,7,8,9 nhân 1,03; còn lại giữ nguyên. */
    private BigDecimal seasonFactor(TripBaseResult base) {
        int month = base.getProductionDate().getMonthValue();
        return (month >= 6 && month <= 9) ? new BigDecimal("1.03") : BigDecimal.ONE;
    }

    /** BC5 — hạng xe A/B/C1/khác. */
    private BigDecimal vehicleClassFactor(Device vehicle) {
        String cls = vehicleRankCode(vehicle);
        if ("A".equalsIgnoreCase(cls)) return new BigDecimal("0.97");
        if ("B".equalsIgnoreCase(cls)) return BigDecimal.ONE;
        if ("C1".equalsIgnoreCase(cls)) return new BigDecimal("1.04");
        return new BigDecimal("1.06");
    }

    /** BD5 — xe đã cải tạo toa nhân 1,03. */
    private BigDecimal carRenovationFactor(Device vehicle) {
        return "CaiToa".equalsIgnoreCase(trim(vehicle.getCarRenovation()))
                ? new BigDecimal("1.03") : BigDecimal.ONE;
    }

    /**
     * BE5 — HS Than (CN-NK).
     *
     * <p>Docx ghi rõ: <i>"xét theo thứ tự từ trên xuống, thoả mãn điều kiện
     * nào thì không xét tiếp"</i> — nên đây là chuỗi if/else, không phải các
     * điều kiện rời.
     */
    private BigDecimal coalCnNkFactor(TransportReportTrip trip, Device vehicle, TripBaseResult base) {
        if (!"Than_CN".equalsIgnoreCase(trim(base.getAcceptanceProduct()))) {
            return BigDecimal.ONE;
        }
        String model = vehicleModel(vehicle);
        if ("VolvoA40F".equalsIgnoreCase(model) || "VolvoA40G".equalsIgnoreCase(model)) {
            return new BigDecimal("1.02");
        }
        String area = trip.getExcavationArea() != null ? trim(trip.getExcavationArea().getCode()) : "";
        String cargoTypeName = trip.getCargoType() != null ? trim(trip.getCargoType().getName()) : "";
        if ("CS".equalsIgnoreCase(area) && "SPNT.Baichua".equalsIgnoreCase(cargoTypeName)
                && startsWith(model, "HD465")) {
            return new BigDecimal("0.9");
        }
        BigDecimal distance = decimal(trip.getTotalRouteDistanceKm());
        if (distance.compareTo(new BigDecimal("1.5")) < 0 && startsWith(model, "HD465-7R")) {
            return new BigDecimal("1.15");
        }
        return BigDecimal.ONE;
    }

    /**
     * BK5 — BSNL SC,BD theo chủng loại xe.
     *
     * <p>Bảng tính so trên {@code DF5 = LEFT(DA5, 7)}, tức mã chủng loại xe +
     * DMNL cắt còn 7 ký tự. Giữ nguyên cách cắt đó: nhánh so với
     * {@code "HD465-7R"} (8 ký tự) trong bảng tính vốn không bao giờ đúng, mà
     * xe HD465-7R vẫn rơi vào nhánh {@code "HD465-7"} nên kết quả không đổi.
     */
    private BigDecimal maintenanceRate(String fuelClassKey) {
        String df = fuelClassKey.length() > 7 ? fuelClassKey.substring(0, 7) : fuelClassKey;
        if (equalsAny(df, "HD465-7", "CAT773E")) return new BigDecimal("0.01");
        if (equalsAny(df, "CAT777", "CAT777D", "CAT777E", "HD785-7")) return new BigDecimal("0.005");
        return new BigDecimal("0.015");
    }

    /** BL5 — số xe bắt đầu bằng 965. */
    private boolean isVehicle965(Device vehicle) {
        return startsWith(trim(vehicle.getCode()), "965");
    }

    /** BM5 — BSNL SPNT, xét theo CHỦNG LOẠI HÀNG (cột K), không phải nhóm. */
    private BigDecimal spntRate(TransportReportTrip trip, Device vehicle) {
        String cargoTypeName = trip.getCargoType() != null ? trim(trip.getCargoType().getName()) : "";
        if (!equalsAny(cargoTypeName, "spnt_uot.via", "spnt.via")) return BigDecimal.ZERO;
        String model = vehicleModel(vehicle);
        return equalsAny(model, "HM400-2R", "VolvoA40F", "VolvoA40G")
                ? new BigDecimal("0.1") : new BigDecimal("0.15");
    }

    /** BN5 — BSNL bùn; hệ số do người dùng đặt trong danh mục Hệ số. */
    private BigDecimal mudRate(TransportReportTrip trip, Device vehicle, List<String> warnings) {
        if ("HM400-2R".equalsIgnoreCase(vehicleModel(vehicle))) return BigDecimal.ZERO;
        String cargo = trip.getCargoType() != null ? trim(trip.getCargoType().getName()) : "";
        boolean isMud = startsWith(cargo, "B.Duot") || startsWith(cargo, "B.Loang")
                || startsWith(cargo, "DBChan") || startsWith(cargo, "B.Chan")
                || startsWith(cargo, "B.Tron") || startsWith(cargo, "DBTron");
        if (!isMud) return BigDecimal.ZERO;

        return coefficientRepository.findByCode(COEFFICIENT_MUD)
                .map(CoefficientItem::getValue)
                .orElseGet(() -> {
                    warnings.add("Danh mục Hệ số chưa có mã \"" + COEFFICIENT_MUD
                            + "\" (hệ số bùn) — khoản bù nhiên liệu cho bùn tính bằng 0.");
                    return BigDecimal.ZERO;
                });
    }

    /** EC5 — HS điều chỉnh NLĐM, khoá dòng {@code chủngLoạiXe_hạng_phânLoại}. */
    private BigDecimal adjustmentFactor(MatrixGridResponse grid, Device vehicle,
                                        String classification, String areaCode,
                                        TransportReportTrip trip, List<String> warnings) {
        if (grid == null) return null;
        String vehicleClass = vehicleRankCode(vehicle);
        String rowKey = vehicleModel(vehicle) + "_"
                + (vehicleClass.isEmpty() ? "" : vehicleClass.substring(0, 1))
                + "_" + classification;
        BigDecimal value = cell(grid, rowKey, trim(areaCode));
        if (value == null) {
            warnings.add("Chuyến id=" + trip.getId() + ": lưới HS điều chỉnh NLĐM chưa có ô ["
                    + rowKey + " × " + areaCode + "] nên chưa tính được NLĐM hiện hành.");
        }
        return value;
    }

    /**
     * BR5 — Định mức năng suất xe tải (chuyến/ca).
     *
     * <p>Cung độ &gt; 8 thì lấy 8; ngược lại làm tròn 1 chữ số thập phân
     * (docx dòng 437–440). Dòng là cung độ, cột là chủng loại xe + phân loại.
     */
    private BigDecimal productivityNorm(MatrixGridResponse grid, TransportReportTrip trip,
                                        Device vehicle, String classification,
                                        BigDecimal routeDistance, List<String> warnings) {
        if (grid == null) return null;
        if (trip.getTripCount() == null || trip.getTripCount() == 0 || routeDistance.signum() == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal lookupDistance = routeDistance.compareTo(MAX_DISTANCE_FOR_PRODUCTIVITY) > 0
                ? MAX_DISTANCE_FOR_PRODUCTIVITY
                : routeDistance.setScale(1, RoundingMode.HALF_UP);

        String rowKey = grid.getRows().stream()
                .filter(r -> r.getNumericValue() != null
                        && r.getNumericValue().compareTo(lookupDistance) == 0)
                .map(MatrixGridResponse.AxisEntry::getKey)
                .findFirst().orElse(null);
        String colKey = ProductionKeys.vehicleCategoryKey(
                vehicle.getFuelClass().getCode(), classification);

        if (rowKey == null) {
            warnings.add("Chuyến id=" + trip.getId() + ": lưới Năng suất xe chưa có dòng cung độ "
                    + lookupDistance + ".");
            return null;
        }
        BigDecimal value = cell(grid, rowKey, colKey);
        if (value == null) {
            warnings.add("Chuyến id=" + trip.getId() + ": lưới Năng suất xe chưa có ô ["
                    + rowKey + " × " + colKey + "].");
        }
        return value;
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    /** DQ5 — Chủng loại xe, lưu ở {@code Device.category.name}. */
    private static String vehicleModel(Device vehicle) {
        return vehicle.getCategory() != null ? trim(vehicle.getCategory().getName()) : "";
    }

    /**
     * DB5 — Hạng xe.
     *
     * <p>Ưu tiên khoá ngoại tới danh mục Hạng xe (QĐ-13); chỉ lùi về chuỗi tự
     * do {@code vehicle_class} cho những thiết bị chưa kịp khai lại theo danh
     * mục. Không lùi ngược lại: khai theo danh mục là nguồn đúng.
     */
    private static String vehicleRankCode(Device vehicle) {
        if (vehicle.getVehicleRank() != null) {
            return trim(vehicle.getVehicleRank().getCode());
        }
        @SuppressWarnings("deprecation")
        String legacy = vehicle.getVehicleClass();
        return trim(legacy);
    }

    private static boolean isRoda(TransportReportTrip trip) {
        LoadLevel level = trip.getLoadLevel();
        return level != null && level.getType() == LoadLevelType.RODA_2_3;
    }

    private static BigDecimal cell(MatrixGridResponse grid, String rowKey, String colKey) {
        var row = grid.getCells().get(rowKey);
        return row == null ? null : row.get(colKey);
    }

    private static BigDecimal pct(BigDecimal base, BigDecimal rate) {
        return base.multiply(rate).setScale(6, RoundingMode.HALF_UP);
    }

    private static BigDecimal scale(BigDecimal v) {
        return v == null ? null : v.setScale(6, RoundingMode.HALF_UP);
    }

    private static BigDecimal decimal(Double v) {
        return v == null ? BigDecimal.ZERO : BigDecimal.valueOf(v);
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }

    private static boolean startsWith(String value, String prefix) {
        return value != null && value.toUpperCase().startsWith(prefix.toUpperCase());
    }

    private static boolean equalsAny(String value, String... candidates) {
        for (String c : candidates) {
            if (c.equalsIgnoreCase(value)) return true;
        }
        return false;
    }
}
