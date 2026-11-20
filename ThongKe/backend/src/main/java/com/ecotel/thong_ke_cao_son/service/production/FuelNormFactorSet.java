package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.enums.FuelBsnlType;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Bộ hệ số ĐMNL / BSNL đã nạp MỘT LẦN cho cả kỳ tính (danh mục: theo mùa, theo hạng xe, theo cải tạo ben, HS Than
 * CN-NK, hệ số BSNL). Bất biến và không chạm CSDL — gọi cho từng chuyến không phát sinh truy vấn nào.
 *
 * <p>Chưa khai trong danh mục thì: hệ số ĐMNL (mùa, hạng xe, cải tạo ben, HS Than) = 1 (giữ nguyên định mức);
 * BSNL = 0 (không bù) — chủ dự án chốt 2026-11-16.
 */
public final class FuelNormFactorSet {

    /** Một dòng danh mục đã tách khỏi thực thể (không còn tham chiếu lười). */
    public record Rule(Long id, FuelNormFactorKind kind, FuelBsnlType bsnlType, LocalDate from, LocalDate to,
                       Long vehicleRankId, String vehicleType, String vehicleCode, String cargo, String areaGroup,
                       BigDecimal maxDistanceKm, int priority, Integer roundDigits, BigDecimal factor) {}

    /** Thông tin chuyến dùng để xét điều kiện của HS Than (CN-NK) và BSNL. */
    public record Context(String fuelClassCode, String vehicleTypeCode, String vehicleCode, String cargoName,
                          String areaGroup, BigDecimal distanceKm, YearMonth month,
                          boolean roda, boolean rainyDay, boolean supplementary) {}

    /** Kết quả tra một loại BSNL: tỷ lệ và số chữ số làm tròn (null = không làm tròn thêm). */
    public record BsnlRate(BigDecimal rate, Integer roundDigits) {
        public static final BsnlRate NONE = new BsnlRate(BigDecimal.ZERO, null);
    }

    private static final FuelNormFactorSet EMPTY = new FuelNormFactorSet(List.of());

    private final List<Rule> rules;

    public FuelNormFactorSet(List<Rule> rules) {
        this.rules = List.copyOf(rules);
    }

    /** Danh mục trống: hệ số ĐMNL bằng 1, BSNL bằng 0. */
    public static FuelNormFactorSet empty() {
        return EMPTY;
    }

    /** Các nhóm CHƯA có dòng nào — để báo lại cho người tính kỳ biết hệ số đang là mặc định (1 / 0). */
    public Set<FuelNormFactorKind> missingKinds() {
        Set<FuelNormFactorKind> missing = EnumSet.allOf(FuelNormFactorKind.class);
        rules.forEach(r -> missing.remove(r.kind()));
        return missing;
    }

    /** Hệ số theo mùa của tháng {@code month}. */
    public BigDecimal seasonFactor(YearMonth month) {
        return coveringFactor(FuelNormFactorKind.SEASON, month, null);
    }

    /** Hệ số theo hạng xe; xe chưa khai hạng thì 1. */
    public BigDecimal rankFactor(Long vehicleRankId, YearMonth month) {
        if (vehicleRankId == null) return BigDecimal.ONE;
        return coveringFactor(FuelNormFactorKind.VEHICLE_RANK, month, vehicleRankId);
    }

    /** Hệ số cải tạo ben của tháng {@code month} (chỉ nhân khi xe được đánh dấu Cải tạo toa). */
    public BigDecimal renovationFactor(YearMonth month) {
        return coveringFactor(FuelNormFactorKind.CAR_RENOVATION, month, null);
    }

    /**
     * HS Than (CN-NK): xét các dòng theo THỨ TỰ ƯU TIÊN tăng dần (cùng thứ tự thì theo id), dòng nào thoả TẤT CẢ điều
     * kiện đã khai thì dùng hệ số của dòng đó và không xét tiếp; không dòng nào thoả → 1.
     */
    public BigDecimal coalFactor(Context ctx) {
        return orderedRules(FuelNormFactorKind.COAL_CN_NK, null).stream()
                .filter(r -> matches(r, ctx))
                .map(Rule::factor)
                .findFirst()
                .orElse(BigDecimal.ONE);
    }

    /**
     * Tỷ lệ BSNL của loại {@code type}: Roda / Ngày mưa / Bổ túc chỉ xét khi chuyến có cờ tương ứng (không có cờ → 0);
     * các dòng của loại đó xét theo thứ tự ưu tiên, dòng thoả đầu tiên thắng; không dòng nào thoả → 0.
     */
    public BsnlRate bsnl(FuelBsnlType type, Context ctx) {
        if (type == FuelBsnlType.RODA && !ctx.roda()) return BsnlRate.NONE;
        if (type == FuelBsnlType.RAINY_DAY && !ctx.rainyDay()) return BsnlRate.NONE;
        if (type == FuelBsnlType.SUPPLEMENTARY && !ctx.supplementary()) return BsnlRate.NONE;
        return orderedRules(FuelNormFactorKind.BSNL, type).stream()
                .filter(r -> matches(r, ctx))
                .map(r -> new BsnlRate(r.factor(), r.roundDigits()))
                .findFirst()
                .orElse(BsnlRate.NONE);
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private List<Rule> orderedRules(FuelNormFactorKind kind, FuelBsnlType bsnlType) {
        return rules.stream()
                .filter(r -> r.kind() == kind)
                .filter(r -> bsnlType == null || r.bsnlType() == bsnlType)
                .sorted(Comparator.comparingInt(Rule::priority)
                        .thenComparing(Rule::id, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private BigDecimal coveringFactor(FuelNormFactorKind kind, YearMonth month, Long rankId) {
        return rules.stream()
                .filter(r -> r.kind() == kind)
                .filter(r -> rankId == null || rankId.equals(r.vehicleRankId()))
                .filter(r -> covers(r, month))
                .max(Comparator.comparing(Rule::from))
                .map(Rule::factor)
                .orElse(BigDecimal.ONE);
    }

    private static boolean covers(Rule r, YearMonth month) {
        LocalDate start = month.atDay(1);
        return !start.isBefore(r.from()) && !start.isAfter(r.to());
    }

    /** Dòng thoả khi trong khoảng thời gian VÀ mọi điều kiện đã khai (để trống = bỏ qua). */
    private static boolean matches(Rule r, Context ctx) {
        return covers(r, ctx.month())
                && matchesList(r.vehicleType(), ctx.fuelClassCode(), ctx.vehicleTypeCode())
                && matchesList(r.vehicleCode(), ctx.vehicleCode())
                && matchesList(r.cargo(), ctx.cargoName())
                && (r.areaGroup() == null || r.areaGroup().isBlank() || r.areaGroup().equalsIgnoreCase(ctx.areaGroup()))
                && (r.maxDistanceKm() == null
                    || (ctx.distanceKm() != null && ctx.distanceKm().compareTo(r.maxDistanceKm()) < 0));
    }

    /**
     * Điều kiện dạng danh sách: để trống = không xét; nhiều giá trị cách nhau bằng dấu phẩy/chấm phẩy, thoả khi MỘT
     * giá trị khớp MỘT trong các mã của chuyến. Giá trị kết thúc bằng {@code *} = "bắt đầu bằng"; còn lại bằng nhau,
     * không phân biệt hoa thường.
     */
    static boolean matchesList(String patterns, String... codes) {
        if (patterns == null || patterns.isBlank()) return true;
        List<String> wanted = new ArrayList<>(Arrays.asList(patterns.toLowerCase(Locale.ROOT).split("[,;]")));
        for (String w : wanted) {
            String p = w.trim();
            if (p.isEmpty()) continue;
            for (String code : codes) {
                if (code == null || code.isBlank()) continue;
                String c = code.trim().toLowerCase(Locale.ROOT);
                if (p.endsWith("*") ? c.startsWith(p.substring(0, p.length() - 1)) : c.equals(p)) return true;
            }
        }
        return false;
    }
}
