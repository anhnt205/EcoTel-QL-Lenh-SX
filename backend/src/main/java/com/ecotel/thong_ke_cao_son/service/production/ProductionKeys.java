package com.ecotel.thong_ke_cao_son.service.production;

/**
 * Các khoá DẪN XUẤT mà công thức dùng để tra lưới.
 *
 * <p>Gom vào một chỗ vì cùng lý do với
 * {@link com.ecotel.thong_ke_cao_son.service.SeamGroupExcavatorKeys}: khoá
 * phải được dựng đúng MỘT cách, nếu không dòng danh mục sẽ không bao giờ
 * khớp và triệu chứng chỉ là "thiếu khai báo".
 */
public final class ProductionKeys {

    private ProductionKeys() {}

    /** Phân loại ĐẤT. */
    public static final String CLASS_EARTH = "DAT";
    /** Phân loại THAN. */
    public static final String CLASS_COAL = "Than";

    private static final String AREA_CS = "CS";

    /**
     * Cột của lưới Mô hình và lưới Định mức nhiên liệu — cột {@code DA} của
     * bảng tính:
     *
     * <pre>
     * DA5 = INDEX(DSXE, …) & IF(D5="CS", ".CS", ".KC")
     * </pre>
     *
     * <p>Tức khoá cột là <b>chủng loại xe + DMNL kèm hậu tố khu vực</b>
     * ({@code CAT777E.CS}), KHÔNG phải mã trần. Hậu tố là nhị phân: đúng khu
     * vực {@code CS} thì {@code .CS}, mọi khu vực khác đều {@code .KC}.
     */
    public static String vehicleFuelClassKey(String fuelClassCode, String excavationAreaCode) {
        if (fuelClassCode == null || fuelClassCode.isBlank()) return "";
        return fuelClassCode.trim() + (AREA_CS.equalsIgnoreCase(trim(excavationAreaCode)) ? ".CS" : ".KC");
    }

    /**
     * Dòng của lưới Năng suất xe (996) — cột {@code BR} của bảng tính:
     *
     * <pre>
     * MATCH( LEFT($DA5, LEN($DA5)-3) & "." & AD5, NS.CLXE, 0)
     * </pre>
     *
     * <p>{@code LEFT(…, len-3)} cắt đúng hậu tố {@code .CS}/{@code .KC} vừa
     * thêm ở trên, rồi nối phân loại — cho ra {@code CAT777E.DAT}.
     *
     * <p>Đáng lưu ý: khoá này <b>dẫn xuất</b> từ chủng loại xe + DMNL, không
     * đọc từ thuộc tính "Chủng loại xe + Phân loại" của thiết bị. Danh mục
     * đó vẫn cần, nhưng để làm nhãn dòng của lưới.
     */
    public static String vehicleCategoryKey(String fuelClassCode, String classification) {
        if (fuelClassCode == null || fuelClassCode.isBlank()) return "";
        return fuelClassCode.trim() + "." + classification;
    }

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

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }
}
