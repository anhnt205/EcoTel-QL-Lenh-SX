package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.FuelNormFactorRequest;
import com.ecotel.thong_ke_cao_son.dto.response.FuelNormFactorResponse;
import com.ecotel.thong_ke_cao_son.enums.FuelBsnlType;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.model.FuelNormFactor;
import com.ecotel.thong_ke_cao_son.repository.FuelNormFactorRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleRankRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Kiểm tra khi lưu năm danh mục hệ số ĐMNL / BSNL. */
@ExtendWith(MockitoExtension.class)
class FuelNormFactorServiceTest {

    @Mock private FuelNormFactorRepository repository;
    @Mock private VehicleRankRepository vehicleRankRepository;

    private FuelNormFactorService service() {
        return new FuelNormFactorService(repository, vehicleRankRepository);
    }

    private static FuelNormFactorRequest request(String period, String factor) {
        FuelNormFactorRequest r = new FuelNormFactorRequest();
        r.setPeriod(period);
        r.setFactor(new BigDecimal(factor));
        return r;
    }

    private static FuelNormFactor existingSeason(long id, String from, String to) {
        FuelNormFactor f = new FuelNormFactor();
        f.setId(id);
        f.setKind(FuelNormFactorKind.SEASON);
        f.setEffectiveFrom(LocalDate.parse(from));
        f.setEffectiveTo(LocalDate.parse(to));
        f.setFactor(new BigDecimal("1.03"));
        return f;
    }

    @Test
    @DisplayName("hệ số theo mùa: khoảng thời gian chồng lấn dòng đã có → bị từ chối (một tháng không được có hai hệ số)")
    void seasonOverlapRejected() {
        when(repository.findByKind(FuelNormFactorKind.SEASON)).thenReturn(List.of(existingSeason(1L, "2026-06-01", "2026-09-01")));

        assertThatThrownBy(() -> service().create(FuelNormFactorKind.SEASON, request("09/2026 - 12/2026", "1.05")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("chồng lấn");
    }

    @Test
    @DisplayName("hệ số theo mùa: khoảng liền kề, không giao nhau → lưu được")
    void seasonAdjacentAccepted() {
        when(repository.findByKind(FuelNormFactorKind.SEASON)).thenReturn(List.of(existingSeason(1L, "2026-06-01", "2026-09-01")));
        when(repository.save(any(FuelNormFactor.class))).thenAnswer(inv -> inv.getArgument(0));

        FuelNormFactorResponse r = service().create(FuelNormFactorKind.SEASON, request("10/2026 - 12/2026", "1"));

        assertThat(r.getPeriod()).isEqualTo("10/2026 - 12/2026");
    }

    @Test
    @DisplayName("hệ số ĐMNL phải > 0; riêng BSNL cho phép 0 (vd bùn của HM400-2R) nhưng không âm")
    void factorBounds() {
        assertThatThrownBy(() -> service().create(FuelNormFactorKind.SEASON, request("06/2026 - 09/2026", "0")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("lớn hơn 0");

        FuelNormFactorRequest negative = request("06/2026 - 09/2026", "-0.1");
        negative.setBsnlType("Bùn");
        assertThatThrownBy(() -> service().create(FuelNormFactorKind.BSNL, negative))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("không được âm");
    }

    @Test
    @DisplayName("Hệ số BSNL: loại BSNL sai → báo lỗi; loại đúng và hệ số 0 → lưu được, giữ điều kiện đã khai")
    void bsnlTypeValidationAndSave() {
        FuelNormFactorRequest bad = request("06/2026 - 09/2026", "0.05");
        bad.setBsnlType("Không có");
        assertThatThrownBy(() -> service().create(FuelNormFactorKind.BSNL, bad))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Loại BSNL");

        when(repository.save(any(FuelNormFactor.class))).thenAnswer(inv -> inv.getArgument(0));
        FuelNormFactorRequest ok = request("06/2026 - 09/2026", "0");
        ok.setBsnlType("bùn");
        ok.setVehicleType("HM400-2R");
        ok.setPriority(1);

        FuelNormFactorResponse r = service().create(FuelNormFactorKind.BSNL, ok);

        assertThat(r.getBsnlType()).isEqualTo(FuelBsnlType.MUD.getLabel());
        assertThat(r.getVehicleType()).isEqualTo("HM400-2R");
        assertThat(r.getPriority()).isEqualTo(1);
    }

    @Test
    @DisplayName("HS Than (CN-NK): mỗi dạng điều kiện chỉ giữ trường của nó, thứ tự xét = thứ tự dạng, thiếu trường bắt buộc → lỗi")
    void coalConditionsKeepOnlyTheirFields() {
        when(repository.save(any(FuelNormFactor.class))).thenAnswer(inv -> inv.getArgument(0));

        FuelNormFactorRequest byVehicle = request("01/2026 - 12/2026", "1.02");
        byVehicle.setCoalCondition("Chủng loại xe");
        byVehicle.setVehicleType("VolvoA40F, VolvoA40G");
        byVehicle.setAreaGroup("CS");
        byVehicle.setCargo("x");
        byVehicle.setMaxDistanceKm(new java.math.BigDecimal("1.5"));
        FuelNormFactorResponse r = service().create(FuelNormFactorKind.COAL_CN_NK, byVehicle);
        assertThat(r.getAreaGroup()).isNull();
        assertThat(r.getCargo()).isNull();
        assertThat(r.getMaxDistanceKm()).isNull();
        assertThat(r.getPriority()).isEqualTo(1);

        FuelNormFactorRequest areaCargo = request("01/2026 - 12/2026", "0.9");
        areaCargo.setCoalCondition("Khu vực + Hàng + Xe");
        areaCargo.setVehicleType("HD465*");
        areaCargo.setAreaGroup("cs");
        areaCargo.setCargo("SPNT.Baichua");
        r = service().create(FuelNormFactorKind.COAL_CN_NK, areaCargo);
        assertThat(r.getAreaGroup()).isEqualTo("CS");
        assertThat(r.getCargo()).isEqualTo("SPNT.Baichua");
        assertThat(r.getPriority()).isEqualTo(2);

        FuelNormFactorRequest distance = request("01/2026 - 12/2026", "1.15");
        distance.setCoalCondition("Cung độ + Xe");
        distance.setVehicleType("HD465-7R");
        distance.setMaxDistanceKm(new java.math.BigDecimal("1.5"));
        distance.setAreaGroup("CS");
        r = service().create(FuelNormFactorKind.COAL_CN_NK, distance);
        assertThat(r.getMaxDistanceKm()).isEqualByComparingTo("1.5");
        assertThat(r.getAreaGroup()).isNull();
        assertThat(r.getPriority()).isEqualTo(3);

        FuelNormFactorRequest missing = request("01/2026 - 12/2026", "1.15");
        missing.setCoalCondition("Cung độ + Xe");
        missing.setVehicleType("HD465-7R");
        assertThatThrownBy(() -> service().create(FuelNormFactorKind.COAL_CN_NK, missing))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Cung độ");
    }

    @Test
    @DisplayName("Hệ số BSNL: mỗi loại chỉ giữ các trường phù hợp — Roda không giữ điều kiện, Bùn giữ cả loại xe, hàng, làm tròn")
    void bsnlKeepsOnlyFieldsOfItsType() {
        when(repository.save(any(FuelNormFactor.class))).thenAnswer(inv -> inv.getArgument(0));

        FuelNormFactorRequest roda = request("06/2026 - 09/2026", "0.5");
        roda.setBsnlType("Roda");
        roda.setVehicleType("HD465*");
        roda.setVehicleCode("965*");
        roda.setCargo("spnt.via");
        roda.setPriority(3);
        roda.setRoundDigits(1);
        FuelNormFactorResponse r = service().create(FuelNormFactorKind.BSNL, roda);
        assertThat(r.getVehicleType()).isNull();
        assertThat(r.getVehicleCode()).isNull();
        assertThat(r.getCargo()).isNull();
        assertThat(r.getRoundDigits()).isNull();
        assertThat(r.getPriority()).isZero();

        FuelNormFactorRequest other = request("06/2026 - 09/2026", "0.05");
        other.setBsnlType("Khác");
        other.setVehicleType("HD465*");
        other.setVehicleCode("965*");
        r = service().create(FuelNormFactorKind.BSNL, other);
        assertThat(r.getVehicleCode()).isEqualTo("965*");
        assertThat(r.getVehicleType()).isNull();

        FuelNormFactorRequest mud = request("06/2026 - 09/2026", "1");
        mud.setBsnlType("Bùn");
        mud.setVehicleType("HM400-2R");
        mud.setCargo("B.Tron*");
        mud.setVehicleCode("965*");
        mud.setRoundDigits(1);
        r = service().create(FuelNormFactorKind.BSNL, mud);
        assertThat(r.getVehicleType()).isEqualTo("HM400-2R");
        assertThat(r.getCargo()).isEqualTo("B.Tron*");
        assertThat(r.getRoundDigits()).isEqualTo(1);
        assertThat(r.getVehicleCode()).isNull();
    }

    @Test
    @DisplayName("cột điều kiện không thuộc nhóm bị bỏ: hệ số theo mùa không lưu chủng loại xe dù request có gửi")
    void irrelevantColumnsDropped() {
        when(repository.findByKind(FuelNormFactorKind.SEASON)).thenReturn(List.of());
        when(repository.save(any(FuelNormFactor.class))).thenAnswer(inv -> inv.getArgument(0));
        FuelNormFactorRequest r = request("06/2026 - 09/2026", "1.03");
        r.setVehicleType("HD465*");
        r.setCargo("spnt.via");

        FuelNormFactorResponse saved = service().create(FuelNormFactorKind.SEASON, r);

        assertThat(saved.getVehicleType()).isNull();
        assertThat(saved.getCargo()).isNull();
        assertThat(saved.getPriority()).isNull();
    }
}
