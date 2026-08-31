package com.ecotel.thong_ke_cao_son.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Dựng khoá ghép <b>"Nhóm vỉa + Máy xúc"</b> (QĐ-06, docx dòng 490–500).
 *
 * <pre>
 * Khoá = Nhóm vỉa _ Nhóm tầng _ Máy xúc _ Ký hiệu bùn _ Khu vực xúc _ hậu tố
 * ví dụ: PA.PCMB.S+90_75_ht7._CS_BK_dthai
 * </pre>
 *
 * <p><b>Vì sao gom vào một lớp:</b> khoá này được dựng ở HAI nơi — màn danh
 * mục STD (người dùng khai báo dòng cho khoá nào) và engine tính sản lượng
 * (mỗi chuyến suy ra khoá của nó để tra STD). Nếu hai nơi dựng khác nhau dù
 * chỉ một dấu gạch dưới thì <b>không bao giờ khớp</b>, và triệu chứng sẽ là
 * "thiếu dữ liệu STD" chứ không phải một lỗi rõ ràng.
 *
 * <p><b>Hai vai trò tách bạch:</b>
 * <ul>
 *   <li>{@link #compose} — ghép từ các thành phần đã biết. Màn danh mục dùng
 *       cái này: lúc khai báo STD chưa có chuyến nào để suy hậu tố, nên hậu
 *       tố do người dùng chọn.</li>
 *   <li>{@link #deriveSuffixes} — suy hậu tố từ dữ liệu chuyến. Engine dùng
 *       cái này. Docx dòng 219/241 ghi khoá trong bảng STD là "tự set", tức
 *       nó được GHÉP chứ không gõ tự do.</li>
 * </ul>
 */
public final class SeamGroupExcavatorKeys {

    private SeamGroupExcavatorKeys() {}

    /** Bốn hậu tố hợp lệ, đúng thứ tự ưu tiên trong docx. */
    public static final String SUFFIX_BK = "BK";
    public static final String SUFFIX_SPNT = "SPNT";
    public static final String SUFFIX_2_25 = "2,25";
    public static final String SUFFIX_DTHAI = "dthai";

    public static final List<String> ALL_SUFFIXES =
            List.of(SUFFIX_BK, SUFFIX_SPNT, SUFFIX_2_25, SUFFIX_DTHAI);

    private static final String SEPARATOR = "_";
    private static final BigDecimal DENSITY_2_25 = new BigDecimal("2.25");

    /**
     * Ghép khoá từ các thành phần.
     *
     * <p>Thành phần rỗng bị <b>bỏ qua</b>, không sinh ra dấu gạch dưới kép.
     * Căn cứ: ví dụ trong docx {@code PA.PCMB.S+90_75_ht7._CS_BK_dthai} chỉ
     * có 5 dấu gạch dưới cho 7 vị trí, tức ô "Ký hiệu bùn" trống đã bị bỏ
     * hẳn chứ không để lại chỗ trống.
     */
    public static String compose(String seamGroup, String benchGroup, String excavator,
                                 String mudMark, String excavationArea, List<String> suffixes) {
        List<String> parts = new ArrayList<>();
        addIfPresent(parts, seamGroup);
        addIfPresent(parts, benchGroup);
        addIfPresent(parts, excavator);
        addIfPresent(parts, mudMark);
        addIfPresent(parts, excavationArea);
        if (suffixes != null) {
            // Giữ đúng thứ tự chuẩn, không theo thứ tự người dùng bấm chọn —
            // cùng một tập hậu tố phải luôn cho ra cùng một chuỗi khoá.
            for (String s : ALL_SUFFIXES) {
                if (suffixes.stream().anyMatch(x -> s.equalsIgnoreCase(trim(x)))) {
                    parts.add(s);
                }
            }
        }
        return String.join(SEPARATOR, parts);
    }

    /**
     * Suy hậu tố từ dữ liệu của một chuyến — docx dòng 492–500.
     *
     * <pre>
     * Bước 1 (kiểm tra Băng tải TRƯỚC):
     *   Nơi dỡ tải = Băng tải           → _BK
     *   ngược lại, Nhóm CLH = SPNT.via  → _SPNT
     * Bước 2:
     *   Nhóm CLH = SPNT.via             → giữ nguyên
     *   Nhóm CLH ≠ SPNT.via và Tỷ trọng = 2,25 → _2,25
     *   Chủng loại hàng = Dthai         → _dthai
     * </pre>
     */
    public static List<String> deriveSuffixes(String unloadingPoint, String cargoGroup,
                                              BigDecimal density, String cargoType) {
        List<String> out = new ArrayList<>();
        boolean isConveyor = equalsLoose(unloadingPoint, "Băng tải");
        boolean isSpntVia = equalsLoose(cargoGroup, "SPNT.via");

        // Ưu tiên Băng tải: docx nói rõ "Nếu Nơi dở tải ≠ Băng tải MỚI kiểm
        // tra SPNT.via", nên đây là if/else, không phải hai điều kiện rời.
        if (isConveyor) {
            out.add(SUFFIX_BK);
        } else if (isSpntVia) {
            out.add(SUFFIX_SPNT);
        }

        if (!isSpntVia) {
            // So sánh BigDecimal bằng compareTo: 2.25 và 2.250 bằng nhau về
            // giá trị nhưng equals() lại cho false vì khác scale.
            if (density != null && density.compareTo(DENSITY_2_25) == 0) {
                out.add(SUFFIX_2_25);
            }
        }

        if (equalsLoose(cargoType, "Dthai")) {
            out.add(SUFFIX_DTHAI);
        }
        return out;
    }

    /**
     * KÝ HIỆU BÙN — thành phần thứ tư của khoá, suy từ Chủng loại hàng.
     *
     * <p>Cột {@code BW} của bảng tính, khớp docx dòng 458–465:
     *
     * <pre>
     * BW5 = IF(OR(LEFT(K5,6)="B.Loan", … ,"_Bun",
     *        IF(LEFT(K5,6)="BunDac","_BĐ",
     *         IF(LEFT(K5,5)="D.uot","_D.uot",
     *          IF(LEFT(K5,6)="DBchan","_Dbun",
     *           IF(LEFT(K5,6)="DBtron","_Dbun","")))))
     *       & IF(RIGHT(K5,2)="cũ","_cũ","")
     * </pre>
     *
     * <p>Hai điểm dễ sai:
     * <ul>
     *   <li>Hậu tố {@code _cũ} được <b>NỐI THÊM</b>, không phải nhánh thay thế
     *       — docx đọc như một trường hợp riêng, nhưng Excel dùng dấu
     *       {@code &}. Theo Excel.</li>
     *   <li>Bảng tính ghép {@code E5 & BW5} <b>không có dấu ngăn</b> vì bản
     *       thân {@code BW5} đã mang sẵn dấu gạch dưới. Ở đây trả về giá trị
     *       ĐÃ BỎ gạch dưới đầu, để {@link #compose} tự nối như mọi thành
     *       phần khác — nếu không sẽ thành gạch dưới kép.</li>
     * </ul>
     */
    public static String mudMark(String cargoType) {
        String k = trim(cargoType);
        if (k.isEmpty()) return "";

        String mark = "";
        if (startsWithAny(k, "B.Loan", "B.Duot", "B.Tron", "Btr.Tron", "B.chan")) {
            mark = "_Bun";
        } else if (startsWithAny(k, "BunDac")) {
            mark = "_BĐ";
        } else if (startsWithAny(k, "D.uot")) {
            mark = "_D.uot";
        } else if (startsWithAny(k, "DBchan", "DBtron")) {
            mark = "_Dbun";
        }
        if (k.toLowerCase().endsWith("cũ")) {
            mark = mark + "_cũ";
        }
        // Bỏ đúng một dấu gạch dưới đầu; compose() sẽ tự thêm lại khi nối.
        return mark.startsWith(SEPARATOR) ? mark.substring(1) : mark;
    }

    private static boolean startsWithAny(String value, String... prefixes) {
        for (String p : prefixes) {
            if (value.regionMatches(true, 0, p, 0, p.length())) return true;
        }
        return false;
    }

    private static void addIfPresent(List<String> parts, String value) {
        String v = trim(value);
        if (!v.isEmpty()) parts.add(v);
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }

    private static boolean equalsLoose(String a, String b) {
        return trim(a).equalsIgnoreCase(trim(b));
    }

    /** Tách một khoá đã ghép trở lại các phần — dùng để hiển thị/kiểm tra. */
    public static List<String> split(String key) {
        return key == null || key.isBlank()
                ? List.of()
                : Arrays.asList(key.split(SEPARATOR));
    }
}
