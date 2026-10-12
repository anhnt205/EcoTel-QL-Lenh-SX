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

        String areaGroup = TripBaseCalculator.areaGroupOf(trip);
        String classification = ProductionKeys.classify(base.getAcceptanceProduct());

        // Khoá cột ĐMNL (cột DE) dựng theo QUY TẮC trên "Chủng loại xe (NL)",
        // KHÔNG gắn hậu tố khu vực — QĐ-11. Điều kiện rẽ nhánh là DC, ghép từ
        // "Chủng loại xe" + chữ đầu Hạng xe, tức hai danh mục KHÁC.
        String fuelClassKey = ProductionKeys.fuelNormVehicleKey(
                vehicle.getFuelClass().getCode(),
                ProductionKeys.vehicleTypeRankKey(vehicleTypeCode(vehicle), vehicleRankCode(vehicle)),
                trip.getCargoType() != null ? trip.getCargoType().getCode() : null,
                trip.getUnloadingPoint() != null ? trip.getUnloadingPoint().getName() : null,
                base.getAcceptanceProduct(),
                classification);

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
        BigDecimal bk = pct(bg, maintenanceRate(
                ProductionKeys.modelColumnKey(vehicleTypeCode(vehicle), areaGroup)));
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
                classification, areaGroup, base, trip, warnings);
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
        // So theo NHÓM khu vực, không so mã (QĐ-13).
        String cargoTypeName = trip.getCargoType() != null ? trim(trip.getCargoType().getName()) : "";
        if (ProductionKeys.AREA_CS.equals(TripBaseCalculator.areaGroupOf(trip))
                && "SPNT.Baichua".equalsIgnoreCase(cargoTypeName)
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
     * <p>Bảng tính so trên {@code DF5 = LEFT(DA5, 7)}, tức khoá cột <b>Mô
     * hình</b> (Chủng loại xe kèm hậu tố khu vực) cắt còn 7 ký tự — KHÔNG
     * phải khoá ĐMNL. Giữ nguyên cách cắt đó: nhánh so với {@code "HD465-7R"}
     * (8 ký tự) trong bảng tính vốn không bao giờ đúng, mà xe HD465-7R vẫn
     * rơi vào nhánh {@code "HD465-7"} nên kết quả không đổi.
     */
    private BigDecimal maintenanceRate(String modelColumnKey) {
        String df = modelColumnKey.length() > 7 ? modelColumnKey.substring(0, 7) : modelColumnKey;
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
                    // Chữ "tính bằng 0" ở đây từng đúng khi hàm này chỉ CẢNH
                    // BÁO — từ QĐ-04/QĐ-06 (2026-09-07, sau Quality Gate của
                    // Codex), `warnings` không còn là cảnh báo suông: dòng
                    // này khiến `calculatePeriod` ném lỗi tổng hợp và KHÔNG
                    // lưu gì hết, chứ không âm thầm cho hệ số bùn bằng 0 nữa.
                    warnings.add("Danh mục Hệ số chưa có mã \"" + COEFFICIENT_MUD + "\" (hệ số bùn).");
                    return BigDecimal.ZERO;
                });
    }

    /**
     * EC5 — HS điều chỉnh NLĐM.
     *
     * <p>Khoá DÒNG {@code EA5 = <Chủng loại xe (NL)>_<chữ đầu Hạng xe>_<Phân
     * loại>}; khoá CỘT {@code T<tháng>.<nhóm khu vực>} (QĐ-12) — bảng có 12
     * tháng × 2 nhóm, nên phải chọn cột theo THÁNG của ngày sản xuất chứ
     * không chỉ theo khu vực như trước.
     */
    private BigDecimal adjustmentFactor(MatrixGridResponse grid, Device vehicle,
                                        String classification, String areaGroup,
                                        TripBaseResult base,
                                        TransportReportTrip trip, List<String> warnings) {
        if (grid == null) return null;
        String rowKey = ProductionKeys.fuelAdjustRowKey(
                vehicle.getFuelClass() != null ? vehicle.getFuelClass().getCode() : null,
                vehicleRankCode(vehicle), classification);
        String colKey = ProductionKeys.fuelAdjustColumnKey(base.getProductionDate(), areaGroup);
        BigDecimal value = cell(grid, rowKey, colKey);
        if (value == null) {
            warnings.add("Chuyến id=" + trip.getId() + ": lưới HS điều chỉnh NLĐM chưa có ô ["
                    + rowKey + " × " + colKey + "] nên chưa tính được NLĐM hiện hành.");
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
        // Cột lưới Năng suất xe dựng trên "Chủng loại xe" (cột DA cắt hậu tố),
        // KHÔNG phải "Chủng loại xe (NL)" và cũng không phải chủng loại hàng.
        String colKey = ProductionKeys.vehicleOutputColumnKey(
                vehicleTypeCode(vehicle), classification);

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

    /**
     * DQ5 — <b>Chủng loại xe (NL)</b>, khoá ngoại tới danh mục cùng tên.
     *
     * <p>Trước 07/09/2026 hàm này đọc {@code Device.category.name} (danh mục
     * Loại thiết bị) — SAI: đó là loại thiết bị, không phải chủng loại xe.
     * Lùi về tên loại thiết bị khi xe chưa khai, để dữ liệu cũ không đứt.
     */
    private static String vehicleModel(Device vehicle) {
        if (vehicle.getFuelClass() != null) {
            return trim(vehicle.getFuelClass().getCode());
        }
        return vehicle.getCategory() != null ? trim(vehicle.getCategory().getName()) : "";
    }

    /**
     * DA5 (phần trước hậu tố) — <b>Chủng loại xe</b>, gốc khoá cột lưới Mô
     * hình và Năng suất xe. KHÁC {@link #vehicleModel} (QĐ-11).
     */
    private static String vehicleTypeCode(Device vehicle) {
        return vehicle.getVehicleType() != null ? trim(vehicle.getVehicleType().getCode()) : "";
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
