package com.ecotel.thong_ke_cao_son.service.production;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * Các khoá DẪN XUẤT mà công thức dùng để tra lưới.
 *
 * <p>Gom vào một chỗ vì cùng lý do với
 * {@link com.ecotel.thong_ke_cao_son.service.SeamGroupExcavatorKeys}: khoá
 * phải được dựng đúng MỘT cách, nếu không dòng danh mục sẽ không bao giờ
 * khớp và triệu chứng chỉ là "thiếu khai báo".
 *
 * <h2>BỐN họ khoá KHÁC NHAU — đừng dùng lẫn (QĐ-11)</h2>
 *
 * Trước 07/09/2026 code gộp chung hậu tố {@code .CS}/{@code .KC} cho cả bốn
 * bảng tra. Sai. Gốc của nhầm lẫn: {@code RA_SOAT_CHUAN_HOA_DANH_MUC.md:375}
 * đặt tiêu đề <i>"Khoá cột lưới Mô hình / DMNL có HẬU TỐ KHU VỰC"</i> nhưng
 * bên dưới chỉ trích công thức của <b>Mô hình</b>.
 *
 * <p>Bằng chứng sống (bảng tính dòng 1250) — bốn chuỗi khác nhau, cùng một xe:
 * <pre>
 * DQ = CAT777E        Chủng loại xe (NL)
 * DA = CAT777E.CS     Chủng loại xe + hậu tố khu vực
 * DE = CAT777E.BK     khoá tra ĐMNL — hậu tố THEO QUY TẮC
 * CZ = CAT777E.CS.BK
 * </pre>
 *
 * <table>
 *   <caption>Bốn họ khoá</caption>
 *   <tr><th>Bảng tra</th><th>Gốc</th><th>Khoá</th></tr>
 *   <tr><td>Mô hình</td><td>Chủng loại xe (DA)</td>
 *       <td>{@link #modelColumnKey}</td></tr>
 *   <tr><td>Năng suất xe (996)</td><td>Chủng loại xe (DA)</td>
 *       <td>{@link #vehicleOutputColumnKey}</td></tr>
 *   <tr><td>Định mức nhiên liệu</td><td>Chủng loại xe NL (DQ)</td>
 *       <td>{@link #fuelNormVehicleKey}</td></tr>
 *   <tr><td>HS điều chỉnh NLĐM</td><td>Chủng loại xe NL (DQ)</td>
 *       <td>{@link #fuelAdjustRowKey} × {@link #fuelAdjustColumnKey}</td></tr>
 * </table>
 */
public final class ProductionKeys {

    private ProductionKeys() {}

    /** Phân loại ĐẤT. */
    public static final String CLASS_EARTH = "DAT";
    /** Phân loại THAN. */
    public static final String CLASS_COAL = "Than";

    /** Nhóm khu vực xúc — bảng tính chỉ biết hai giá trị này (QĐ-13). */
    public static final String AREA_CS = "CS";
    public static final String AREA_KC = "KC";

    // ── Nhóm khu vực ────────────────────────────────────────────────────

    /**
     * Nhóm khu vực dùng cho mọi công thức so {@code D5="CS"}/{@code "KC"}.
     *
     * <p>Danh mục Khu vực xúc thật có nhiều khu (Khu Bắc, Khu Nam, Bãi
     * thải…) nên KHÔNG được so thẳng mã khu vực với {@code "CS"} — đó là lỗi
     * cũ. Ưu tiên thuộc tính "Nhóm khu vực" đã khai; chỉ khi khu vực chưa
     * khai nhóm mới lùi về so mã, để dữ liệu cũ không đứt ngay.
     *
     * @param declaredGroup {@code ExcavationArea.areaGroup} — có thể null
     * @param areaCode      mã khu vực, chỉ dùng khi chưa khai nhóm
     */
    public static String areaGroup(String declaredGroup, String areaCode) {
        String g = trim(declaredGroup);
        if (AREA_CS.equalsIgnoreCase(g)) return AREA_CS;
        if (AREA_KC.equalsIgnoreCase(g)) return AREA_KC;
        // Chưa khai nhóm → suy tạm từ mã, đúng hành vi cũ.
        return AREA_CS.equalsIgnoreCase(trim(areaCode)) ? AREA_CS : AREA_KC;
    }

    // ── 1. Mô hình (m3/chuyến) ──────────────────────────────────────────

    /**
     * Cột lưới <b>Mô hình</b> — cột {@code DA} của bảng tính:
     *
     * <pre>
     * DA5 = &lt;Chủng loại xe&gt; &amp; IF(D5="CS", ".CS", ".KC")
     * </pre>
     *
     * <p>Gốc là danh mục <b>Chủng loại xe</b> ({@code Device.vehicleType}),
     * KHÔNG phải "Chủng loại xe (NL)". Hậu tố ở đây thật sự là khu vực — đây
     * là bảng tra DUY NHẤT đúng như vậy.
     */
    public static String modelColumnKey(String vehicleTypeCode, String areaGroup) {
        String base = trim(vehicleTypeCode);
        if (base.isEmpty()) return "";
        return base + "." + areaGroup(areaGroup, null);
    }

    // ── 2. Năng suất xe (996) ───────────────────────────────────────────

    /**
     * Cột lưới <b>Năng suất xe (996)</b> — cột {@code BR} của bảng tính:
     *
     * <pre>
     * MATCH( LEFT($DA5, LEN($DA5)-3) &amp; "." &amp; AD5, NS.CLXE, 0)
     * </pre>
     *
     * <p>{@code LEFT(…, len-3)} cắt đúng hậu tố {@code .CS}/{@code .KC} của
     * {@code DA5}, tức trả về <b>Chủng loại xe</b> trần, rồi nối Phân loại →
     * {@code CAT777E.DAT}. Gốc là XE, không phải chủng loại hàng.
     */
    public static String vehicleOutputColumnKey(String vehicleTypeCode, String classification) {
        String base = trim(vehicleTypeCode);
        if (base.isEmpty()) return "";
        return base + "." + trim(classification);
    }

    // ── 3. Định mức nhiên liệu ──────────────────────────────────────────

    /** Chủng loại hàng khiến xe HM400-2R hạng C được coi là chở BÙN ({@code DE5} nhánh 1). */
    private static final List<String> MUD_CARGO_TYPES =
            List.of("B.Duot", "DBuot", "B.Duot.CN", "Dbuot.CN");
    /** {@code DC5} của ba xe được xét nhánh ".Dat" ({@code DE5} nhánh 2). */
    private static final List<String> DIRT_VEHICLE_DC =
            List.of("VolvoA40-GCoi_A", "VolvoA40-F_C", "HM400-2R_C");
    /** Chủng loại hàng đi băng tải ({@code DE5} nhánh 3). */
    private static final List<String> BELT_CARGO_TYPES =
            List.of("SPNT.via", "SPNT_uot.via");

    private static final String DC_MUD_VEHICLE = "HM400-2R_C";

    /**
     * {@code DC} — Chủng loại xe + Hạng xe, điều kiện rẽ nhánh của {@link
     * #fuelNormVehicleKey}:
     *
     * <pre>
     * DC5 = LEFT(DA5, LEN(DA5)-3) &amp; "_" &amp; LEFT(DB5,1)
     * </pre>
     *
     * tức {@code <Chủng loại xe>_<chữ đầu Hạng xe>}, vd {@code HM400-2R_C}.
     */
    public static String vehicleTypeRankKey(String vehicleTypeCode, String vehicleRankCode) {
        return trim(vehicleTypeCode) + "_" + firstChar(vehicleRankCode);
    }

    /**
     * Phần XE của khoá cột lưới <b>Định mức nhiên liệu</b> — cột {@code DE}
     * ("LoaiXe_DMNL") của bảng tính.
     *
     * <p>Gốc là {@code DQ} (<b>Chủng loại xe NL</b>), hậu tố suy ra
     * <b>theo quy tắc</b>, KHÔNG phải hậu tố khu vực. Xét theo thứ tự từ
     * trên xuống, thoả điều kiện nào thì dừng:
     *
     * <ol>
     *   <li>{@code DC = "HM400-2R_C"} và chủng loại hàng là bùn → {@code .Bun}</li>
     *   <li>{@code DC} thuộc ba xe cạp và (hàng "bundac" | dỡ ở "Cạp…" |
     *       SPNT = "Dat_CN") → {@code .Dat}</li>
     *   <li>dỡ ở "Băng tải." hoặc hàng thuộc SPNT vỉa → {@code .BK}</li>
     *   <li>còn lại → {@code .} + Phân loại</li>
     * </ol>
     *
     * <p>So chuỗi bằng {@code equalsIgnoreCase}: Excel {@code MATCH} không
     * phân biệt hoa thường, và chính {@code AD5} trả {@code "DAT"} viết hoa
     * nhưng {@code "Than"} viết thường (QĐ-10).
     *
     * @param fuelClassCode     {@code DQ} — {@code Device.fuelClass.code}
     * @param vehicleTypeRank   {@code DC} — xem {@link #vehicleTypeRankKey}
     * @param cargoTypeCode     {@code K} — mã chủng loại hàng
     * @param unloadingPoint    {@code I} — tên nơi dỡ tải
     * @param acceptanceProduct {@code AG} — sản phẩm nghiệm thu
     * @param classification    {@code AD} — xem {@link #classify}
     */
    public static String fuelNormVehicleKey(String fuelClassCode, String vehicleTypeRank,
                                            String cargoTypeCode, String unloadingPoint,
                                            String acceptanceProduct, String classification) {
        String base = trim(fuelClassCode);
        if (base.isEmpty()) return "";

        String dc = trim(vehicleTypeRank);
        String cargo = trim(cargoTypeCode);
        String unload = trim(unloadingPoint);

        // 1 — bùn
        if (DC_MUD_VEHICLE.equalsIgnoreCase(dc)
                && (startsWith(cargo, "B.Loang") || equalsAny(cargo, MUD_CARGO_TYPES))) {
            return base + ".Bun";
        }
        // 2 — đất cạp
        if (equalsAny(dc, DIRT_VEHICLE_DC)
                && (startsWith(cargo, "bundac")
                    || startsWith(unload, "Cạp")
                    || "Dat_CN".equalsIgnoreCase(trim(acceptanceProduct)))) {
            return base + ".Dat";
        }
        // 3 — băng tải / SPNT vỉa
        if ("Băng tải.".equalsIgnoreCase(unload) || equalsAny(cargo, BELT_CARGO_TYPES)) {
            return base + ".BK";
        }
        // 4 — còn lại
        return base + "." + trim(classification);
    }

    // ── 4. HS điều chỉnh NLĐM ───────────────────────────────────────────

    /**
     * Khoá DÒNG lưới <b>HS điều chỉnh NLĐM</b> — cột {@code EA} của bảng tính:
     *
     * <pre>
     * DP5 = DQ5 &amp; "_" &amp; LEFT(DB5,1)
     * EA5 = DP5 &amp; "_" &amp; AD5
     * </pre>
     *
     * tức {@code <Chủng loại xe NL>_<chữ đầu Hạng xe>_<DAT|Than>}, vd
     * {@code CAT777E_C_DAT}. Gốc là {@code DQ}, KHÁC {@link #vehicleTypeRankKey}
     * (gốc {@code DA}).
     */
    public static String fuelAdjustRowKey(String fuelClassCode, String vehicleRankCode,
                                          String classification) {
        String base = trim(fuelClassCode);
        if (base.isEmpty()) return "";
        return base + "_" + firstChar(vehicleRankCode) + "_" + trim(classification);
    }

    /**
     * Khoá CỘT lưới <b>HS điều chỉnh NLĐM</b> (QĐ-12): {@code T<tháng>.<nhóm>},
     * vd {@code T6.CS}.
     *
     * <p>Bảng tính dòng 5 chỉ tra một cặp cột KC/CS, nhưng vùng {@code FW..GY}
     * có ~14 cặp — là các tháng. Chủ dự án đã chốt 12 tháng × 2 nhóm khu vực,
     * nên engine phải chọn cột theo THÁNG của ngày sản xuất, không chỉ theo
     * khu vực.
     */
    public static String fuelAdjustColumnKey(LocalDate productionDate, String areaGroup) {
        int month = productionDate == null ? 1 : productionDate.getMonthValue();
        return "T" + month + "." + areaGroup(areaGroup, null);
    }

    // ── Phân loại (AD) ──────────────────────────────────────────────────

    /**
     * Phân loại Đất/Than — cột {@code AD} của bảng tính:
     *
     * <pre>
     * AD5 = IF(OR(LEFT(AG5,1)="S", LEFT(AG5,1)="D"), "DAT", "Than")
     * </pre>
     *
     * <p>Xét <b>chữ cái đầu</b> của Sản phẩm nghiệm thu, không phải tiền tố
     * {@code Dat_}/{@code Than_}. Khác biệt là thật: {@code SP than sạch}
     * bắt đầu bằng {@code S} nên được xếp là ĐẤT, dù trong tên có chữ "than".
     */
    public static String classify(String acceptanceProduct) {
        String v = trim(acceptanceProduct);
        if (v.isEmpty()) return CLASS_COAL;
        char first = Character.toUpperCase(v.charAt(0));
        return (first == 'S' || first == 'D') ? CLASS_EARTH : CLASS_COAL;
    }

    public static boolean isEarth(String acceptanceProduct) {
        return CLASS_EARTH.equals(classify(acceptanceProduct));
    }

    public static boolean isCoal(String acceptanceProduct) {
        return !isEarth(acceptanceProduct);
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }

    /** {@code LEFT(x,1)} — chuỗi rỗng cho ra chuỗi rỗng, không nổ IndexOutOfBounds. */
    private static String firstChar(String v) {
        String t = trim(v);
        return t.isEmpty() ? "" : t.substring(0, 1);
    }

    private static boolean startsWith(String value, String prefix) {
        return value.toLowerCase(Locale.ROOT).startsWith(prefix.toLowerCase(Locale.ROOT));
    }

    private static boolean equalsAny(String value, List<String> candidates) {
        return candidates.stream().anyMatch(c -> c.equalsIgnoreCase(value));
    }
}
