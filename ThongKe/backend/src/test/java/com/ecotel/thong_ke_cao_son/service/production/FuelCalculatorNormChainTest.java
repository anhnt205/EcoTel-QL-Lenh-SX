package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse.AxisEntry;
import com.ecotel.thong_ke_cao_son.enums.FuelBsnlType;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chuỗi ĐMNL / BSNL đọc từ các DANH MỤC hệ số (chủ dự án chốt 2026-11-16: "tạo động", không còn hằng số trong code):
 * Nt → theo mùa → (công ty) → hãng xe → cải tạo ben → × HS Than (CN-NK) = ĐMNL xe; Nhiên liệu tiêu hao theo ĐM = Tổng Tkm × ĐMNL xe / 1000;
 * mỗi khoản BSNL = tỷ lệ danh mục × Nhiên liệu tiêu hao theo ĐM. Chưa khai: ĐMNL = 1, BSNL = 0.
 */
@ExtendWith(MockitoExtension.class)
class FuelCalculatorNormChainTest {

    @Mock private FuelNormFactorService factorService;

    private static final LocalDate FROM = LocalDate.of(2000, 1, 1);
    private static final LocalDate TO = LocalDate.of(2099, 12, 1);

    private static AxisEntry axis(String key, String numeric) {
        return AxisEntry.builder().key(key).label(key).numericValue(numeric == null ? null : new BigDecimal(numeric)).build();
    }

    /** Lưới DMNL một ô: dòng độ dốc 10, cột {@code <khoá>_<cung độ>} = 100. */
    private static MatrixGridResponse grid(String vehicleKey, String distance) {
        String col = vehicleKey + "_" + distance;
        return MatrixGridResponse.builder()
                .rows(List.of(axis("R10", "10")))
                .cols(List.of(axis(col, null)))
                .cells(Map.of("R10", Map.of(col, new BigDecimal("100"))))
                .build();
    }

    private static Device vehicle(String code, String fuelClass, Long rankId, String rank, String carRenovation) {
        VehicleFuelClass fc = new VehicleFuelClass();
        fc.setCode(fuelClass);
        VehicleType type = new VehicleType();
        type.setCode(fuelClass);
        VehicleRank r = new VehicleRank();
        r.setId(rankId);
        r.setCode(rank);
        Device v = new Device();
        v.setCode(code);
        v.setFuelClass(fc);
        v.setVehicleType(type);
        v.setVehicleRank(r);
        v.setCarRenovation(carRenovation);
        return v;
    }

    private static TransportReportTrip trip(Device vehicle, String cargoName, String areaGroup, double distance) {
        TransportReport report = new TransportReport();
        report.setVehicle(vehicle);
        CargoType cargo = new CargoType();
        cargo.setName(cargoName);
        UnloadingPoint unload = new UnloadingPoint();
        unload.setName("Bãi thải.");
        ExcavationArea area = new ExcavationArea();
        area.setCode("X");
        area.setAreaGroup(areaGroup);
        TransportReportTrip t = new TransportReportTrip();
        t.setId(1L);
        t.setTransportReport(report);
        t.setCargoType(cargo);
        t.setUnloadingPoint(unload);
        t.setExcavationArea(area);
        t.setTotalRouteDistanceKm(distance);
        t.setTotalRouteLiftM(10.0);   // chênh cao thanh toán = 10 → trúng dòng dốc 10
        return t;
    }

    // ── dựng dòng danh mục ──────────────────────────────────────────────────

    private static long seq = 1;

    private static FuelNormFactorSet.Rule season(String factor) {
        return rule(FuelNormFactorKind.SEASON, null, null, null, null, null, null, 0, null, factor);
    }

    private static FuelNormFactorSet.Rule rank(long rankId, String factor) {
        return rule(FuelNormFactorKind.VEHICLE_RANK, null, rankId, null, null, null, null, 0, null, factor);
    }

    private static FuelNormFactorSet.Rule renovation(String factor) {
        return rule(FuelNormFactorKind.CAR_RENOVATION, null, null, null, null, null, null, 0, null, factor);
    }

    private static FuelNormFactorSet.Rule rule(FuelNormFactorKind kind, FuelBsnlType bsnl, Long rankId, String vehicleType,
                                               String vehicleCode, String cargo, String areaGroup, int priority,
                                               Integer round, String factor) {
        return new FuelNormFactorSet.Rule(seq++, kind, bsnl, FROM, TO, rankId, vehicleType, vehicleCode, cargo, areaGroup,
                null, priority, round, new BigDecimal(factor));
    }

    private FuelResult run(TransportReportTrip trip, String vehicleKey, String distance, String product, int month,
                           FuelNormFactorSet.Rule... rules) {
        TripBaseResult base = TripBaseResult.builder()
                .acceptanceProduct(product)
                .productionDate(LocalDate.of(2026, month, 5))
                .totalTkm(new BigDecimal("2000"))
                .build();
        return new FuelCalculator(factorService).calculate(trip, base,
                Map.of("DMNL", grid(vehicleKey, distance)), new FuelNormFactorSet(List.of(rules)));
    }

    @Test
    @DisplayName("danh mục TRỐNG: ĐMNL không đổi (hệ số 1), BSNL = 0; tiêu hao = 2000 × 100 / 1000")
    void emptyCatalogs() {
        FuelResult r = run(trip(vehicle("906", "CAT777D", 1L, "A", "CaiToa"), "Nomin.", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 9);

        assertThat(r.getNormInterpolated()).isEqualByComparingTo("100");
        assertThat(r.getNormSeasonal()).isEqualByComparingTo("100");
        assertThat(r.getNormFinal()).isEqualByComparingTo("100");
        assertThat(r.getBaseConsumption()).isEqualByComparingTo("200");
        assertThat(r.getBsnlRoda()).isEqualByComparingTo("0");
        assertThat(r.getBsnlMud()).isEqualByComparingTo("0");
        assertThat(r.getTotalBeforeAdjustment()).isEqualByComparingTo("200");
    }

    @Test
    @DisplayName("hệ số mùa 1,03 + hạng xe A 0,97 từ danh mục → 103 → 99,91; tiêu hao = 2000 × 99,91 / 1000 = 199,82")
    void seasonAndRankFromCatalog() {
        FuelResult r = run(trip(vehicle("906", "CAT777D", 1L, "A", null), "Nomin.", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 9, season("1.03"), rank(1L, "0.97"), rank(2L, "1"));

        assertThat(r.getNormSeasonal()).isEqualByComparingTo("103");
        assertThat(r.getNormVehicleClass()).isEqualByComparingTo("99.91");
        assertThat(r.getNormCarRenovation()).isEqualByComparingTo("99.91");
        assertThat(r.getNormFinal()).isEqualByComparingTo("99.91");
        assertThat(r.getBaseConsumption()).isEqualByComparingTo("199.82");
    }

    @Test
    @DisplayName("hạng xe chưa có dòng trong danh mục → hệ số 1; hệ số cải tạo ben chỉ nhân khi xe được đánh dấu Cải tạo toa")
    void unlistedRankAndRenovationFlag() {
        FuelNormFactorSet.Rule[] catalog = {rank(1L, "0.97"), renovation("1.03")};

        FuelResult unlisted = run(trip(vehicle("906", "CAT777D", 9L, "C2", null), "Nomin.", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 5, catalog);
        FuelResult renovated = run(trip(vehicle("906", "CAT777D", 9L, "C2", "CaiToa"), "Nomin.", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 5, catalog);

        assertThat(unlisted.getNormVehicleClass()).isEqualByComparingTo("100");
        assertThat(unlisted.getNormCarRenovation()).isEqualByComparingTo("100");
        assertThat(renovated.getNormCarRenovation()).isEqualByComparingTo("103");
    }

    @Test
    @DisplayName("HS Than (CN-NK) từ danh mục: nhiều dòng điều kiện, xét theo thứ tự ưu tiên, dòng thoả đầu tiên thắng; SPNT/CN khác Than_CN → 1")
    void coalFactorFromCatalogByPriority() {
        FuelNormFactorSet.Rule volvo = rule(FuelNormFactorKind.COAL_CN_NK, null, null, "VolvoA40F, VolvoA40G", null, null, null, 1, null, "1.02");
        FuelNormFactorSet.Rule baichua = rule(FuelNormFactorKind.COAL_CN_NK, null, null, "HD465*", null, "SPNT.Baichua", "CS", 2, null, "0.9");
        FuelNormFactorSet.Rule shortHaul = new FuelNormFactorSet.Rule(seq++, FuelNormFactorKind.COAL_CN_NK, null, FROM, TO,
                null, "HD465-7R", null, null, null, new BigDecimal("1.5"), 3, null, new BigDecimal("1.15"));

        assertThat(run(trip(vehicle("906", "VolvoA40F", 1L, "B", null), "Than.NK", "KC", 3.0),
                "VolvoA40F.Than", "3", "Than_CN", 5, volvo, baichua, shortHaul).getCoalCnNkFactor()).isEqualByComparingTo("1.02");
        assertThat(run(trip(vehicle("906", "HD465-7R", 1L, "B", null), "SPNT.Baichua", "CS", 3.0),
                "HD465-7R.Than", "3", "Than_CN", 5, volvo, baichua, shortHaul).getCoalCnNkFactor()).isEqualByComparingTo("0.9");
        assertThat(run(trip(vehicle("906", "HD465-7R", 1L, "B", null), "Than.NK", "KC", 1.0),
                "HD465-7R.Than", "1", "Than_CN", 5, volvo, baichua, shortHaul).getCoalCnNkFactor()).isEqualByComparingTo("1.15");
        assertThat(run(trip(vehicle("906", "HD465-7R", 1L, "B", null), "Than.NK", "KC", 3.0),
                "HD465-7R.Than", "3", "Than_CN", 5, volvo, baichua, shortHaul).getCoalCnNkFactor()).isEqualByComparingTo("1");
        // SPNT/CN khác Than_CN → 1 dù xe là VolvoA40F
        assertThat(run(trip(vehicle("906", "VolvoA40F", 1L, "B", null), "Nomin.", "KC", 3.0),
                "VolvoA40F.DAT", "3", "Dat_SX", 5, volvo, baichua, shortHaul).getCoalCnNkFactor()).isEqualByComparingTo("1");
    }

    @Test
    @DisplayName("BSNL từ danh mục: Roda 0,5 / ngày mưa 5% / bổ túc 4% chỉ khi chuyến có cờ; xe số 965* → khác 0,05")
    void bsnlFlagsAndVehicleCode() {
        FuelNormFactorSet.Rule roda = rule(FuelNormFactorKind.BSNL, FuelBsnlType.RODA, null, null, null, null, null, 0, null, "0.5");
        FuelNormFactorSet.Rule rain = rule(FuelNormFactorKind.BSNL, FuelBsnlType.RAINY_DAY, null, null, null, null, null, 0, null, "0.05");
        FuelNormFactorSet.Rule helper = rule(FuelNormFactorKind.BSNL, FuelBsnlType.SUPPLEMENTARY, null, null, null, null, null, 0, null, "0.04");
        FuelNormFactorSet.Rule other = rule(FuelNormFactorKind.BSNL, FuelBsnlType.OTHER, null, null, "965*", null, null, 0, null, "0.05");

        TransportReportTrip t = trip(vehicle("96501", "CAT777D", 1L, "A", null), "Nomin.", "KC", 3.0);
        t.setRainyDay(true);
        FuelResult r = run(t, "CAT777D.DAT", "3", "Dat_SX", 5, roda, rain, helper, other);

        // BG = 2000 × 100 / 1000 = 200
        assertThat(r.getBsnlRoda()).isEqualByComparingTo("0");          // chuyến không phải Roda
        assertThat(r.getBsnlRainyDay()).isEqualByComparingTo("10");     // 5% × 200
        assertThat(r.getBsnlSupplementary()).isEqualByComparingTo("0"); // không bổ túc
        assertThat(r.getBsnlOther()).isEqualByComparingTo("10");        // số xe 965* → 0,05 × 200
        assertThat(r.getTotalBeforeAdjustment()).isEqualByComparingTo("220");
    }

    @Test
    @DisplayName("BSNL SC,BD: dòng theo chủng loại xe, dòng không điều kiện (1,5%) ở thứ tự sau cùng làm mặc định")
    void bsnlMaintenanceDefaultRow() {
        FuelNormFactorSet.Rule one = rule(FuelNormFactorKind.BSNL, FuelBsnlType.MAINTENANCE, null, "HD465-7*, CAT773E", null, null, null, 1, null, "0.01");
        FuelNormFactorSet.Rule half = rule(FuelNormFactorKind.BSNL, FuelBsnlType.MAINTENANCE, null, "CAT777, CAT777D, CAT777E, HD785-7", null, null, null, 2, null, "0.005");
        FuelNormFactorSet.Rule rest = rule(FuelNormFactorKind.BSNL, FuelBsnlType.MAINTENANCE, null, null, null, null, null, 9, null, "0.015");

        assertThat(run(trip(vehicle("906", "CAT773E", 1L, "A", null), "Nomin.", "KC", 3.0),
                "CAT773E.DAT", "3", "Dat_SX", 5, one, half, rest).getBsnlMaintenance()).isEqualByComparingTo("2");   // 1% × 200
        assertThat(run(trip(vehicle("906", "CAT777D", 1L, "A", null), "Nomin.", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 5, one, half, rest).getBsnlMaintenance()).isEqualByComparingTo("1");   // 0,5% × 200
        assertThat(run(trip(vehicle("906", "ScaniaP340", 1L, "A", null), "Nomin.", "KC", 3.0),
                "ScaniaP340.DAT", "3", "Dat_SX", 5, one, half, rest).getBsnlMaintenance()).isEqualByComparingTo("3"); // 1,5% × 200
    }

    @Test
    @DisplayName("BSNL SPNT: hàng spnt.via / spnt_uot.via — xe HM400-2R, VolvoA40F/G → 0,1; xe khác → 0,15; hàng khác → 0")
    void bsnlSpnt() {
        FuelNormFactorSet.Rule small = rule(FuelNormFactorKind.BSNL, FuelBsnlType.SPNT, null, "HM400-2R, VolvoA40F, VolvoA40G", null, "spnt_uot.via, spnt.via", null, 1, null, "0.1");
        FuelNormFactorSet.Rule big = rule(FuelNormFactorKind.BSNL, FuelBsnlType.SPNT, null, null, null, "spnt_uot.via, spnt.via", null, 2, null, "0.15");

        assertThat(run(trip(vehicle("906", "VolvoA40F", 1L, "A", null), "SPNT.via", "KC", 3.0),
                "VolvoA40F.BK", "3", "Dat_SX", 5, small, big).getBsnlSpnt()).isEqualByComparingTo("20");
        assertThat(run(trip(vehicle("906", "CAT777D", 1L, "A", null), "spnt_uot.via", "KC", 3.0),
                "CAT777D.BK", "3", "Dat_SX", 5, small, big).getBsnlSpnt()).isEqualByComparingTo("30");
        assertThat(run(trip(vehicle("906", "CAT777D", 1L, "A", null), "Nomin.", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 5, small, big).getBsnlSpnt()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("BSNL bùn: HM400-2R → 0 (dòng ưu tiên trước); hàng B.Duot* → hệ số bùn × BG; B.Tron/DBTron → làm tròn 1 chữ số thập phân")
    void bsnlMudWithRounding() {
        FuelNormFactorSet.Rule noMud = rule(FuelNormFactorKind.BSNL, FuelBsnlType.MUD, null, "HM400-2R", null, null, null, 1, null, "0");
        FuelNormFactorSet.Rule mud = rule(FuelNormFactorKind.BSNL, FuelBsnlType.MUD, null, null, null, "B.Duot*, B.Loang*, DBChan*, B.Chan*", null, 2, null, "0.0094");
        FuelNormFactorSet.Rule mixed = rule(FuelNormFactorKind.BSNL, FuelBsnlType.MUD, null, null, null, "B.Tron*, DBTron*", null, 3, 1, "0.0094");

        // BG = 200 → 0,0094 × 200 = 1,88 ; làm tròn 1 chữ số → 1,9
        assertThat(run(trip(vehicle("906", "CAT777D", 1L, "A", null), "B.Duot", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 5, noMud, mud, mixed).getBsnlMud()).isEqualByComparingTo("1.88");
        assertThat(run(trip(vehicle("906", "CAT777D", 1L, "A", null), "B.Tron", "KC", 3.0),
                "CAT777D.DAT", "3", "Dat_SX", 5, noMud, mud, mixed).getBsnlMud()).isEqualByComparingTo("1.9");
        assertThat(run(trip(vehicle("906", "HM400-2R", 1L, "A", null), "B.Duot", "KC", 3.0),
                "HM400-2R.DAT", "3", "Dat_SX", 5, noMud, mud, mixed).getBsnlMud()).isEqualByComparingTo("0");
    }
}
