package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.service.SurveyStandardService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Engine tính sản lượng cho MỘT KỲ.
 *
 * <h2>Vì sao không tính từng chuyến một</h2>
 *
 * Hệ số trắc địa bằng <i>số trắc địa ÷ tổng cộng dồn của cả kỳ</i>, mà tổng
 * ấy lại cộng từ chính kết quả của từng chuyến. Rồi hệ số đó được áp NGƯỢC
 * trở lại từng chuyến. Nên phép tính có <b>ba lượt trên chuyến, xen giữa là
 * hai rào chắn tổng hợp</b> — đọc trực tiếp từ chuỗi công thức thật:
 *
 * <pre>
 * Lượt 1   AL, AM, AN                       (từng chuyến)
 *   ├─ gộp theo (khoá, SPNT) → sinh AP Tdia; S = STD_m3 ÷ ΣAL
 * Lượt 2   DS = AL × S
 *          DW = DS × Thể trọng (TĐ)
 *          DX = DW × Cung độ                (từng chuyến)
 *   ├─ gộp lần hai       → sinh Ap Tkm; DY = STD_tấn ÷ ΣDW, DZ = STD_tkm ÷ ΣDX
 * Lượt 3   DT = DW × DY,  DU = DX × DZ      (từng chuyến)
 * </pre>
 *
 * <p>Hệ quả cần nhớ: <b>kết quả của một chuyến phụ thuộc các chuyến khác
 * cùng kỳ.</b> Sửa một chuyến thì phải tính lại cả kỳ, không thể tính bù
 * riêng chuyến đó.
 *
 * <p><b>Chế độ TKE</b> (QĐ-03): mọi hệ số bằng 1, tức bỏ qua hẳn hai rào
 * chắn — chỉ còn lượt 1 rồi quy đổi thẳng.
 */
@Service
@RequiredArgsConstructor
public class ProductionCalculationService {

    private static final Logger log = LoggerFactory.getLogger(ProductionCalculationService.class);

    /** Nhóm chủng loại hàng bắt đầu bằng chuỗi này thì đi nhánh CTNB. */
    private static final String CTNB_PREFIX = "TCN";

    private static final int HS_SCALE = 10;
    private static final int VALUE_SCALE = 6;

    private final ReportPeriodRepository periodRepository;
    private final TransportReportTripRepository tripRepository;
    private final SurveyStandardRepository surveyStandardRepository;
    private final SurveyCoefficientRepository coefficientRepository;
    private final ProductionResultRepository resultRepository;
    private final TripBaseCalculator baseCalculator;

    /** Tóm tắt một lần chạy, trả về cho người bấm nút tính. */
    @Getter
    public static class CalculationSummary {
        private final int tripCount;
        private final int coefficientRowCount;
        private final boolean tkeMode;
        private final List<String> warnings;

        CalculationSummary(int tripCount, int coefficientRowCount, boolean tkeMode, List<String> warnings) {
            this.tripCount = tripCount;
            this.coefficientRowCount = coefficientRowCount;
            this.tkeMode = tkeMode;
            this.warnings = warnings;
        }
    }

    /**
     * Tính lại toàn bộ một kỳ.
     *
     * <p>Luôn xoá kết quả cũ của kỳ trước khi tính: giữ lại sẽ sinh ra hai
     * thế hệ số liệu lẫn lộn trong cùng một kỳ.
     */
    @Transactional
    public CalculationSummary calculatePeriod(Long periodId, boolean tkeMode) {
        ReportPeriod period = periodRepository.findById(periodId).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy kỳ báo cáo id: " + periodId));

        List<TransportReportTrip> trips = tripRepository.findByReportDateBetween(
                period.getFromDate(), period.getToDate());
        if (trips.isEmpty()) {
            throw new BadRequestException("Kỳ " + period.getDisplayName()
                    + " (" + period.getFromDate() + " - " + period.getToDate()
                    + ") chưa có chuyến vận tải nào để tính.");
        }

        resultRepository.deleteByPeriod(periodId);
        coefficientRepository.deleteByPeriod(periodId);

        List<String> warnings = new ArrayList<>();

        // ── LƯỢT 1 ──────────────────────────────────────────────────────────
        List<TripBaseResult> base = trips.stream().map(baseCalculator::calculate).toList();

        // ── RÀO CHẮN 1: gộp theo (khoá, SPNT) → AP Tdia ─────────────────────
        Map<GroupKey, List<TripBaseResult>> groups = new LinkedHashMap<>();
        for (TripBaseResult r : base) {
            groups.computeIfAbsent(
                    new GroupKey(r.getSeamGroupExcavatorKey(), r.getAcceptanceProduct()),
                    k -> new ArrayList<>()).add(r);
        }

        Map<GroupKey, SurveyCoefficient> apTdia = new LinkedHashMap<>();
        for (Map.Entry<GroupKey, List<TripBaseResult>> e : groups.entrySet()) {
            apTdia.put(e.getKey(),
                    buildApTdia(period, e.getKey(), e.getValue(), tkeMode, warnings));
        }

        // ── LƯỢT 2 ──────────────────────────────────────────────────────────
        List<Stage2> stage2 = new ArrayList<>();
        for (TripBaseResult r : base) {
            GroupKey gk = new GroupKey(r.getSeamGroupExcavatorKey(), r.getAcceptanceProduct());
            stage2.add(applyStage2(r, apTdia.get(gk), tkeMode));
        }

        // ── RÀO CHẮN 2: gộp lần hai → Ap Tkm ────────────────────────────────
        Map<GroupKey, List<Stage2>> groups2 = new LinkedHashMap<>();
        for (Stage2 s : stage2) {
            groups2.computeIfAbsent(
                    new GroupKey(s.base.getSeamGroupExcavatorKey(), s.base.getAcceptanceProduct()),
                    k -> new ArrayList<>()).add(s);
        }

        Map<GroupKey, SurveyCoefficient> apTkm = new LinkedHashMap<>();
        for (Map.Entry<GroupKey, List<Stage2>> e : groups2.entrySet()) {
            apTkm.put(e.getKey(), buildApTkm(period, e.getKey(), e.getValue(), tkeMode));
        }

        // ── LƯỢT 3 + lưu kết quả ────────────────────────────────────────────
        List<ProductionResult> results = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (Stage2 s : stage2) {
            GroupKey gk = new GroupKey(s.base.getSeamGroupExcavatorKey(), s.base.getAcceptanceProduct());
            results.add(finalise(period, s, apTdia.get(gk), apTkm.get(gk), tkeMode, now));
        }

        coefficientRepository.saveAll(apTdia.values());
        coefficientRepository.saveAll(apTkm.values());
        resultRepository.saveAll(results);

        log.info("Tính sản lượng kỳ {}: {} chuyến, {} dòng hệ số, TKE={}",
                period.getDisplayName(), results.size(), apTdia.size() + apTkm.size(), tkeMode);

        return new CalculationSummary(results.size(), apTdia.size() + apTkm.size(), tkeMode, warnings);
    }

    // ── rào chắn 1 ──────────────────────────────────────────────────────────

    private SurveyCoefficient buildApTdia(ReportPeriod period, GroupKey key,
                                          List<TripBaseResult> rows, boolean tkeMode,
                                          List<String> warnings) {
        BigDecimal totalM3 = sum(rows, TripBaseResult::getTotalM3);
        BigDecimal totalTon = sum(rows, TripBaseResult::getTotalTon);
        BigDecimal totalTkm = sum(rows, TripBaseResult::getTotalTkm);

        SurveyCoefficient c = new SurveyCoefficient();
        c.setKind(SurveyCoefficient.Kind.AP_TDIA);
        c.setReportPeriod(period);
        c.setSeamGroupExcavatorKey(key.key());
        c.setAcceptanceProduct(key.product());
        c.setTotalM3(totalM3);
        c.setTotalTon(totalTon);
        c.setTotalTkm(totalTkm);
        c.setTripCount(rows.size());
        c.setGeneratedAt(LocalDateTime.now());

        if (tkeMode) {
            // Chế độ TKE: không dùng số trắc địa, mọi hệ số bằng 1.
            c.setHsM3(BigDecimal.ONE);
            c.setHsTon(BigDecimal.ONE);
            c.setHsTkm(BigDecimal.ONE);
            return c;
        }

        Optional<SurveyStandard> std = findStandard(key, period);
        if (std.isEmpty()) {
            // Không có số trắc địa thì hệ số bằng 0 — đúng docx dòng 253–255
            // ("Tổng m3 = 0 > Đất CN = 0 và HS = 0"). Nhưng phải BÁO cho người
            // dùng, vì lặng lẽ nhân 0 sẽ xoá sạch sản lượng của cả nhóm.
            warnings.add("Chưa khai báo STD cho khoá \"" + key.key()
                    + "\" / " + key.product() + " — hệ số của nhóm này bằng 0.");
            c.setHsM3(BigDecimal.ZERO);
            c.setHsTon(BigDecimal.ZERO);
            c.setHsTkm(BigDecimal.ZERO);
            return c;
        }

        SurveyStandard s = std.get();
        boolean coalBlock = isCoalProduct(key.product());
        c.setSurveyM3(coalBlock ? s.getCoalM3() : s.getEarthM3());
        c.setSurveyTon(coalBlock ? s.getCoalTon() : s.getEarthTon());
        c.setSurveyTkm(coalBlock ? s.getCoalTkm() : s.getEarthTkm());

        c.setHsM3(ratio(c.getSurveyM3(), totalM3));
        c.setHsTon(ratio(c.getSurveyTon(), totalTon));
        c.setHsTkm(ratio(c.getSurveyTkm(), totalTkm));
        return c;
    }

    // ── lượt 2 ──────────────────────────────────────────────────────────────

    /** Kết quả trung gian của lượt 2, chưa lưu xuống CSDL. */
    private record Stage2(TripBaseResult base, BigDecimal ds, BigDecimal dw,
                          BigDecimal dx, BigDecimal bulkDensity) {}

    private Stage2 applyStage2(TripBaseResult r, SurveyCoefficient apTdia, boolean tkeMode) {
        TransportReportTrip trip = r.getTrip();
        boolean ctnb = isCtnb(trip);

        // Nhánh CTNB dùng hệ số chênh lệch của chính chuyến, KHÔNG dùng hệ số
        // trắc địa — DS5 = IF(LEFT(J5,3)="TCN", AF5*AL5, AL5*S5).
        BigDecimal ctnbFactor = ctnbFactor(trip);
        BigDecimal hsM3 = tkeMode ? BigDecimal.ONE : nz(apTdia.getHsM3());

        BigDecimal ds = ctnb
                ? r.getTotalM3().multiply(ctnbFactor)
                : r.getTotalM3().multiply(hsM3);

        BigDecimal bulkDensity = resolveBulkDensity(r, tkeMode);

        // DW5 = IF(TCN, AM5*AF5, DS5*AC5)
        BigDecimal dw = ctnb
                ? r.getTotalTon().multiply(ctnbFactor)
                : ds.multiply(bulkDensity);

        BigDecimal distance = trip.getTotalRouteDistanceKm() != null
                ? BigDecimal.valueOf(trip.getTotalRouteDistanceKm()) : BigDecimal.ZERO;

        return new Stage2(r,
                ds.setScale(VALUE_SCALE, RoundingMode.HALF_UP),
                dw.setScale(VALUE_SCALE, RoundingMode.HALF_UP),
                dw.multiply(distance).setScale(VALUE_SCALE, RoundingMode.HALF_UP),
                bulkDensity);
    }

    /**
     * AC5 — Thể trọng (TĐ) dùng để quy m3 trắc địa sang tấn.
     *
     * <p>Docx dòng 269–273: sản phẩm {@code Dat_TCN}/{@code Than_CN} thì dùng
     * chính Tỷ trọng thường; {@code Dat_SX}/{@code Than_SX}/{@code Dat_CN}
     * thì lấy cột Thể trọng tương ứng trong danh mục STD; còn lại bằng 0.
     */
    private BigDecimal resolveBulkDensity(TripBaseResult r, boolean tkeMode) {
        String product = r.getAcceptanceProduct();
        if (equalsAny(product, "Dat_TCN", "Than_CN")) {
            return r.getDensity();
        }
        if (tkeMode) {
            // Chế độ TKE không đụng tới số trắc địa; dùng tỷ trọng thường để
            // phép quy đổi vẫn có nghĩa thay vì ra 0.
            return r.getDensity();
        }
        if (!equalsAny(product, "Dat_SX", "Than_SX", "Dat_CN")) {
            return BigDecimal.ZERO;
        }
        Optional<SurveyStandard> std = surveyStandardRepository.findEffective(
                standardTypeOf(product), r.getSeamGroupExcavatorKey(), r.getProductionDate());
        if (std.isEmpty()) return BigDecimal.ZERO;

        SurveyStandard s = std.get();
        BigDecimal value = "Than_SX".equalsIgnoreCase(product)
                ? s.getCoalBulkDensity()
                : s.getEarthBulkDensity();
        return nz(value);
    }

    // ── rào chắn 2 ──────────────────────────────────────────────────────────

    private SurveyCoefficient buildApTkm(ReportPeriod period, GroupKey key,
                                         List<Stage2> rows, boolean tkeMode) {
        BigDecimal totalTon = rows.stream().map(Stage2::dw)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTkm = rows.stream().map(Stage2::dx)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        SurveyCoefficient c = new SurveyCoefficient();
        c.setKind(SurveyCoefficient.Kind.AP_TKM);
        c.setReportPeriod(period);
        c.setSeamGroupExcavatorKey(key.key());
        c.setAcceptanceProduct(key.product());
        c.setTotalTon(totalTon);
        c.setTotalTkm(totalTkm);
        c.setTripCount(rows.size());
        c.setGeneratedAt(LocalDateTime.now());

        if (tkeMode) {
            c.setHsTon(BigDecimal.ONE);
            c.setHsTkm(BigDecimal.ONE);
            return c;
        }

        Optional<SurveyStandard> std = findStandard(key, period);
        if (std.isEmpty()) {
            c.setHsTon(BigDecimal.ZERO);
            c.setHsTkm(BigDecimal.ZERO);
            return c;
        }
        SurveyStandard s = std.get();
        boolean coalBlock = isCoalProduct(key.product());
        c.setSurveyTon(coalBlock ? s.getCoalTon() : s.getEarthTon());
        c.setSurveyTkm(coalBlock ? s.getCoalTkm() : s.getEarthTkm());
        c.setHsTon(ratio(c.getSurveyTon(), totalTon));
        c.setHsTkm(ratio(c.getSurveyTkm(), totalTkm));
        return c;
    }

    // ── lượt 3 ──────────────────────────────────────────────────────────────

    private ProductionResult finalise(ReportPeriod period, Stage2 s,
                                      SurveyCoefficient apTdia, SurveyCoefficient apTkm,
                                      boolean tkeMode, LocalDateTime now) {
        TripBaseResult r = s.base();
        boolean ctnb = isCtnb(r.getTrip());

        // DY/DZ bằng 1 ở chế độ TKE và ở nhánh CTNB — chuyến CTNB đã dùng hệ
        // số chênh lệch riêng ở lượt 2, áp thêm hệ số trắc địa là tính hai lần.
        BigDecimal hsTon = (tkeMode || ctnb) ? BigDecimal.ONE : nz(apTkm.getHsTon());
        BigDecimal hsTkm = (tkeMode || ctnb) ? BigDecimal.ONE : nz(apTkm.getHsTkm());

        ProductionResult out = new ProductionResult();
        out.setReportPeriod(period);
        out.setTransportTrip(r.getTrip());
        out.setProductionDate(r.getProductionDate());
        out.setSeamGroupExcavatorKey(r.getSeamGroupExcavatorKey());
        out.setAcceptanceProduct(r.getAcceptanceProduct());

        out.setTotalM3(r.getTotalM3());
        out.setTotalTon(r.getTotalTon());
        out.setTotalTkm(r.getTotalTkm());

        out.setSurveyM3(s.ds());
        out.setSurveyTon(s.dw());
        out.setSurveyTkm(s.dx());

        out.setFinalTon(s.dw().multiply(hsTon).setScale(VALUE_SCALE, RoundingMode.HALF_UP));
        out.setFinalTkm(s.dx().multiply(hsTkm).setScale(VALUE_SCALE, RoundingMode.HALF_UP));

        out.setDensityUsed(r.getDensity());
        out.setModelUsed(r.getModel());
        out.setBulkDensityUsed(s.bulkDensity());
        out.setHsM3(tkeMode ? BigDecimal.ONE : nz(apTdia.getHsM3()));
        out.setHsTon(hsTon);
        out.setHsTkm(hsTkm);
        out.setTkeMode(tkeMode);
        out.setCalculatedAt(now);
        return out;
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private record GroupKey(String key, String product) {}

    private Optional<SurveyStandard> findStandard(GroupKey key, ReportPeriod period) {
        SurveyStandard.CatalogType type = standardTypeOf(key.product());
        // Tra theo ngày ĐẦU kỳ: một kỳ nằm gọn trong một tháng (QĐ-05) nên
        // khoảng hiệu lực của STD không đổi giữa chừng trong kỳ.
        return surveyStandardRepository.findEffective(type, key.key(), period.getFromDate());
    }

    private static SurveyStandard.CatalogType standardTypeOf(String product) {
        return "Dat_CN".equalsIgnoreCase(product)
                ? SurveyStandard.CatalogType.DAT_CN
                : SurveyStandard.CatalogType.DAT_SX_THAN_SX;
    }

    private static boolean isCoalProduct(String product) {
        return product != null && product.toLowerCase().startsWith("than");
    }

    private static boolean isCtnb(TransportReportTrip trip) {
        CargoGroup group = trip.getCargoGroup();
        return group != null && group.getName() != null
                && group.getName().toUpperCase().startsWith(CTNB_PREFIX);
    }

    /** AF5 — HS áp cho than CTNB: bằng 1 khi hệ số chênh lệch bằng 0/trống. */
    private static BigDecimal ctnbFactor(TransportReportTrip trip) {
        BigDecimal v = trip.getCtnbDeviationCoefficient();
        return (v == null || v.signum() == 0) ? BigDecimal.ONE : v;
    }

    /**
     * Hệ số = tử ÷ mẫu, mẫu bằng 0 (hoặc tử trống) thì bằng 0.
     *
     * <p>Trả 0 chứ không ném lỗi chia-cho-0: docx nói rõ tổng bằng 0 thì hệ
     * số bằng 0. Nhưng chỗ gọi có trách nhiệm cảnh báo khi thiếu STD.
     */
    private static BigDecimal ratio(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, HS_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal sum(List<TripBaseResult> rows,
                                  java.util.function.Function<TripBaseResult, BigDecimal> f) {
        return rows.stream().map(f).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static boolean equalsAny(String value, String... candidates) {
        if (value == null) return false;
        for (String c : candidates) {
            if (c.equalsIgnoreCase(value)) return true;
        }
        return false;
    }
}
