package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Nội suy SONG TUYẾN định mức nhiên liệu trên lưới {@code DMNL}.
 *
 * <h2>Hình dạng lưới — đọc từ công thức, không phải đoán</h2>
 *
 * <pre>
 * AT5 = INDEX('DMNL'!$C$7:$AJR$73,
 *             MATCH($AR5, 'DMNL'!$B$7:$B$73, 0),      ← DÒNG  = ĐỘ DỐC
 *             MATCH(DE5&"_"&$AP5, 'DMNL'!$C$6:$AJR$6, 0))  ← CỘT = xe_CUNGĐỘ
 * </pre>
 *
 * Tức: <b>dòng là độ dốc</b>, còn <b>cột gộp chủng loại xe với cung độ</b>
 * thành một khoá (`CAT777E.KC_3`). Dải cung độ vì thế nằm trong TÊN CỘT chứ
 * không phải một trục riêng — bảng tính gốc để chúng ở cột A của sheet.
 *
 * <h2>Bốn góc</h2>
 *
 * <pre>
 * hb, ha : mốc cung độ kề dưới / kề trên  (AP5, AQ5)
 * h1, h2 : mốc độ dốc  kề dưới / kề trên  (AR5, AS5)
 *
 * AV = nội suy theo ĐỘ DỐC tại cột cung độ hb   (từ AT, AU)
 * AY = nội suy theo ĐỘ DỐC tại cột cung độ ha   (từ AW, AX)
 * AZ = nội suy theo CUNG ĐỘ giữa AV và AY
 * </pre>
 *
 * <p>Mốc trùng nhau thì bỏ bước nội suy tương ứng — vừa tránh chia cho 0,
 * vừa đúng nghiệp vụ: hai mốc trùng nghĩa là giá trị đã xác định.
 */
public final class FuelNormInterpolator {

    private FuelNormInterpolator() {}

    private static final int SCALE = 10;
    private static final String COLUMN_SEPARATOR = "_";

    /** Giá trị cùng bốn mốc đã dùng — giữ lại để lần ngược khi số liệu lệch. */
    public record Result(
            BigDecimal value,
            BigDecimal distanceLow, BigDecimal distanceHigh,
            BigDecimal slopeLow, BigDecimal slopeHigh) {}

    /**
     * @param grid          lưới DMNL
     * @param vehicleKey    {@code ProductionKeys.vehicleFuelClassKey}, vd
     *                      {@code CAT777E.KC} — phần đứng trước dấu gạch dưới
     *                      trong tên cột
     * @param routeDistance cung độ toàn tuyến
     * @param liftHeight    chiều cao nâng tải (độ dốc)
     */
    public static Optional<Result> interpolate(MatrixGridResponse grid, String vehicleKey,
                                               BigDecimal routeDistance, BigDecimal liftHeight) {
        // Cung độ bằng 0 -> ĐMNL bằng 0 (docx dòng 362). Không phải lỗi.
        if (routeDistance == null || routeDistance.signum() == 0) {
            return Optional.of(new Result(BigDecimal.ZERO, null, null, null, null));
        }

        List<BigDecimal> distances = distanceBandsOf(grid, vehicleKey);
        if (distances.isEmpty()) return Optional.empty();

        BigDecimal hb = floorOf(distances, routeDistance);
        BigDecimal ha = ceilOf(distances, routeDistance);
        if (hb == null) hb = ha;
        if (ha == null) ha = hb;

        BigDecimal slope = liftHeight == null ? BigDecimal.ZERO : liftHeight;
        List<BigDecimal> slopes = slopeBandsOf(grid);
        if (slopes.isEmpty()) return Optional.empty();

        BigDecimal h1 = floorOf(slopes, slope);
        BigDecimal h2 = ceilOf(slopes, slope);
        if (h1 == null) h1 = h2;
        if (h2 == null) h2 = h1;

        // AV — nội suy theo độ dốc tại cột cung độ THẤP
        BigDecimal av = interpolateOverSlope(grid, vehicleKey, hb, h1, h2, slope);
        // AY — nội suy theo độ dốc tại cột cung độ CAO
        BigDecimal ay = interpolateOverSlope(grid, vehicleKey, ha, h1, h2, slope);
        if (av == null && ay == null) return Optional.empty();
        if (av == null) av = ay;
        if (ay == null) ay = av;

        BigDecimal value = linear(routeDistance, hb, ha, av, ay);
        return Optional.of(new Result(value, hb, ha, h1, h2));
    }

    /** Nội suy hai ô cùng một cột cung độ, khác dòng độ dốc. */
    private static BigDecimal interpolateOverSlope(MatrixGridResponse grid, String vehicleKey,
                                                   BigDecimal distanceBand,
                                                   BigDecimal h1, BigDecimal h2, BigDecimal slope) {
        if (distanceBand == null) return null;
        String colKey = columnKey(vehicleKey, distanceBand);
        BigDecimal at = cellAtSlope(grid, h1, colKey);
        BigDecimal au = cellAtSlope(grid, h2, colKey);
        if (at == null && au == null) return null;
        if (at == null) return au;
        if (au == null) return at;
        return linear(slope, h1, h2, at, au);
    }

    /**
     * Nội suy tuyến tính. Hai mốc trùng thì trả thẳng giá trị mốc — đây là
     * nhánh {@code IF(AR5=AS5, AT5, …)} và cũng là chỗ duy nhất có nguy cơ
     * chia cho 0.
     */
    public static BigDecimal linear(BigDecimal x, BigDecimal x0, BigDecimal x1,
                                    BigDecimal y0, BigDecimal y1) {
        if (x0 == null || x1 == null || y0 == null) return y0;
        if (x0.compareTo(x1) == 0) return y0;
        BigDecimal ratio = x.subtract(x0).divide(x1.subtract(x0), SCALE, RoundingMode.HALF_UP);
        return y0.add(y1.subtract(y0).multiply(ratio));
    }

    /** Tên cột của lưới: {@code <xe>_<cung độ>}. */
    public static String columnKey(String vehicleKey, BigDecimal distanceBand) {
        return vehicleKey + COLUMN_SEPARATOR + trimZeros(distanceBand);
    }

    // ── đọc trục ────────────────────────────────────────────────────────────

    /**
     * Dải cung độ của một chủng loại xe — tách từ ĐUÔI tên cột.
     *
     * <p>Cung độ nằm trong tên cột chứ không phải một trục riêng, nên phải
     * lọc theo tiền tố xe rồi đọc phần số phía sau dấu gạch dưới cuối.
     */
    private static List<BigDecimal> distanceBandsOf(MatrixGridResponse grid, String vehicleKey) {
        String prefix = vehicleKey + COLUMN_SEPARATOR;
        List<BigDecimal> out = new ArrayList<>();
        for (MatrixGridResponse.AxisEntry col : grid.getCols()) {
            String key = col.getKey();
            if (key == null || !key.startsWith(prefix)) continue;
            BigDecimal v = parse(key.substring(prefix.length()));
            if (v != null) out.add(v);
        }
        out.sort(BigDecimal::compareTo);
        return out;
    }

    private static List<BigDecimal> slopeBandsOf(MatrixGridResponse grid) {
        return grid.getRows().stream()
                .map(MatrixGridResponse.AxisEntry::getNumericValue)
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();
    }

    private static BigDecimal cellAtSlope(MatrixGridResponse grid, BigDecimal slopeBand, String colKey) {
        if (slopeBand == null) return null;
        String rowKey = grid.getRows().stream()
                .filter(r -> r.getNumericValue() != null
                        && r.getNumericValue().compareTo(slopeBand) == 0)
                .map(MatrixGridResponse.AxisEntry::getKey)
                .findFirst().orElse(null);
        if (rowKey == null) return null;
        var row = grid.getCells().get(rowKey);
        return row == null ? null : row.get(colKey);
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    /** Mốc lớn nhất còn ≤ giá trị. */
    private static BigDecimal floorOf(List<BigDecimal> axis, BigDecimal value) {
        BigDecimal best = null;
        for (BigDecimal v : axis) {
            if (v.compareTo(value) <= 0) best = v;
        }
        return best;
    }

    /** Mốc nhỏ nhất còn ≥ giá trị. */
    private static BigDecimal ceilOf(List<BigDecimal> axis, BigDecimal value) {
        for (BigDecimal v : axis) {
            if (v.compareTo(value) >= 0) return v;
        }
        return null;
    }

    private static BigDecimal parse(String raw) {
        try {
            return new BigDecimal(raw.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** {@code 3.0} và {@code 3} phải cho ra cùng một tên cột. */
    private static String trimZeros(BigDecimal v) {
        return v.stripTrailingZeros().toPlainString();
    }
}
