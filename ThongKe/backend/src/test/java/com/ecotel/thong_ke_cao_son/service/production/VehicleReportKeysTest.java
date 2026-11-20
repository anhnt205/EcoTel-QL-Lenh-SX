package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Hai cột của bảng Thống kê sản lượng (chủ dự án chốt 2026-11-16):
 * <ul>
 *   <li>Chủng loại xe + Nhóm hạng xe = Chủng loại xe _ Nhóm hạng xe;</li>
 *   <li>Chủng loại xe + ĐMNL = Chủng loại xe + .Bun / .Dat / .BK / .(Phân loại DAT|Than) theo thứ tự nhánh.</li>
 * </ul>
 */
class VehicleReportKeysTest {

    private static Device vehicle(String typeCode, String rankGroupCode) {
        VehicleType type = new VehicleType();
        type.setCode(typeCode);
        Device d = new Device();
        d.setVehicleType(type);
        if (rankGroupCode != null) {
            VehicleRankGroup group = new VehicleRankGroup();
            group.setCode(rankGroupCode);
            VehicleRank rank = new VehicleRank();
            rank.setCode(rankGroupCode + "1");
            rank.setVehicleRankGroup(group);
            d.setVehicleRank(rank);
        }
        return d;
    }

    private static TransportReportTrip trip(String cargoName, String unloadName) {
        CargoType cargo = new CargoType();
        cargo.setName(cargoName);
        UnloadingPoint unload = new UnloadingPoint();
        unload.setName(unloadName);
        TransportReportTrip t = new TransportReportTrip();
        t.setCargoType(cargo);
        t.setUnloadingPoint(unload);
        return t;
    }

    @Test
    @DisplayName("Chủng loại xe + Nhóm hạng xe = Chủng loại xe _ Nhóm hạng xe")
    void typeAndRankGroup() {
        assertThat(ProductionReportService.vehicleTypeRankGroupKeyOf(vehicle("HM400-2R", "C"))).isEqualTo("HM400-2R_C");
        assertThat(ProductionReportService.vehicleTypeRankGroupKeyOf(vehicle("VolvoA40-GCoi", "A"))).isEqualTo("VolvoA40-GCoi_A");
        assertThat(ProductionReportService.vehicleTypeRankGroupKeyOf(new Device())).isNull();
    }

    @Test
    @DisplayName("HM400-2R_C chở bùn (B.Duot) → Chủng loại xe + .Bun")
    void mud() {
        assertThat(ProductionReportService.vehicleFuelNormKeyOf(vehicle("HM400-2R", "C"), trip("B.Duot", "Bãi thải."), "Dat_SX"))
                .isEqualTo("HM400-2R.Bun");
    }

    @Test
    @DisplayName("VolvoA40-F_C dỡ ở Cạp… (hoặc hàng bundac, hoặc SPNT Dat_CN) → .Dat")
    void dirt() {
        assertThat(ProductionReportService.vehicleFuelNormKeyOf(vehicle("VolvoA40-F", "C"), trip("DaXit.NK", "Cạp đường."), "Dat_SX"))
                .isEqualTo("VolvoA40-F.Dat");
        assertThat(ProductionReportService.vehicleFuelNormKeyOf(vehicle("HM400-2R", "C"), trip("DaXit.NK", "Bãi thải."), "Dat_CN"))
                .isEqualTo("HM400-2R.Dat");
    }

    @Test
    @DisplayName("không thoả hai nhánh đầu: hàng SPNT.via / SPNT_uot.via → .BK")
    void belt() {
        assertThat(ProductionReportService.vehicleFuelNormKeyOf(vehicle("CAT777E", "B"), trip("SPNT_uot.via", "Bãi thải."), "Than_SX"))
                .isEqualTo("CAT777E.BK");
    }

    @Test
    @DisplayName("không thoả trường hợp nào → Chủng loại xe + .(Phân loại): Đất = DAT, Than = Than")
    void classification() {
        assertThat(ProductionReportService.vehicleFuelNormKeyOf(vehicle("CAT777E", "B"), trip("DaXit.NK", "Bãi thải."), "Dat_SX"))
                .isEqualTo("CAT777E.DAT");
        assertThat(ProductionReportService.vehicleFuelNormKeyOf(vehicle("CAT777E", "B"), trip("Than.NK", "Bãi thải."), "Than_CN"))
                .isEqualTo("CAT777E.Than");
    }
}
