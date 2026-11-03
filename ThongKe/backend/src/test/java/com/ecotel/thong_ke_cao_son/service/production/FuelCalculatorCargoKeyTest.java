package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.CoefficientItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Đối soát tháng 9/2026 với Excel (2026-11-04): {@code FuelCalculator} từng truyền
 * {@code CargoType.getCode()} ("CLH-014") vào {@link ProductionKeys#fuelNormVehicleKey}, hàm này
 * so với TÊN chủng loại hàng ("SPNT.via", "B.Loang…") nên nhánh "SPNT vỉa → .BK" không bao giờ khớp
 * (352 dòng đã duyệt lấy nhầm cột .DAT). Test dựng lưới DMNL rỗng để lỗi "chưa có cột …" nói rõ cột
 * mà engine đã chọn.
 */
@ExtendWith(MockitoExtension.class)
class FuelCalculatorCargoKeyTest {

    @Mock private CoefficientItemRepository coefficientRepository;

    private static TransportReportTrip trip(String cargoCode, String cargoName, String unloading) {
        VehicleFuelClass fuelClass = new VehicleFuelClass();
        fuelClass.setCode("CAT777D");
        VehicleType vehicleType = new VehicleType();
        vehicleType.setCode("CAT777D");
        VehicleRank rank = new VehicleRank();
        rank.setCode("C2");
        Device vehicle = new Device();
        vehicle.setCode("906");
        vehicle.setFuelClass(fuelClass);
        vehicle.setVehicleType(vehicleType);
        vehicle.setVehicleRank(rank);
        TransportReport report = new TransportReport();
        report.setVehicle(vehicle);
        CargoType cargo = new CargoType();
        cargo.setCode(cargoCode);
        cargo.setName(cargoName);
        UnloadingPoint unloadingPoint = new UnloadingPoint();
        unloadingPoint.setName(unloading);
        TransportReportTrip t = new TransportReportTrip();
        t.setId(1L);
        t.setTransportReport(report);
        t.setCargoType(cargo);
        t.setUnloadingPoint(unloadingPoint);
        t.setTotalRouteDistanceKm(3.0);
        t.setTotalRouteLiftM(10.0);
        return t;
    }

    private List<String> warningsFor(TransportReportTrip trip, String acceptanceProduct) {
        MatrixGridResponse emptyGrid = MatrixGridResponse.builder()
                .rows(List.of()).cols(List.of()).cells(Map.of()).build();
        TripBaseResult base = TripBaseResult.builder().acceptanceProduct(acceptanceProduct).build();
        return new FuelCalculator(coefficientRepository)
                .calculate(trip, base, Map.of("DMNL", emptyGrid)).getWarnings();
    }

    @Test
    @DisplayName("SPNT vỉa đổ ngoài băng tải: chọn cột .BK theo TÊN hàng dù mã danh mục là CLH-014")
    void beltCargoNameSelectsBkColumnEvenThoughCodeIsACatalogNumber() {
        List<String> warnings = warningsFor(trip("CLH-014", "SPNT.VIA", "Khe Chàm."), "SPNT_VIA");

        assertThat(warnings).anyMatch(w -> w.contains("\"CAT777D.BK\""));
    }

    @Test
    @DisplayName("Hàng thường đổ ngoài băng tải: vẫn rơi về cột theo phân loại (.DAT), không bị kéo sang .BK")
    void ordinaryCargoStillUsesClassificationColumn() {
        List<String> warnings = warningsFor(trip("CLH-001", "Nomin.", "Khe Chàm."), "Dat_SX");

        assertThat(warnings).anyMatch(w -> w.contains("\"CAT777D.DAT\""));
    }
}
