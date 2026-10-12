package com.ecotel.thong_ke_cao_son.service.production;

import java.util.List;

/**
 * Ba cột MÃ HOÁ HÀNG của bảng tính — {@code BT}, {@code BU}, {@code BV}.
 *
 * <p>Đây là các nhãn dùng cho biên bản nghiệm thu, suy hoàn toàn từ dữ liệu
 * đã có nên không cần khai báo thêm gì.
 */
public final class CargoCoding {

    private CargoCoding() {}

    /** Nhóm vỉa đặc biệt được đổi mã hàng — {@code BU5}. */
    private static final String SEAM_GROUP_PCMB = "PA.PCMB.S+90";

    /**
     * Ba nơi nhận tải khiến {@code xitNK} thành {@code daloaiNK}.
     *
     * <p>Bảng tính viết thẳng ba tên này vào công thức
     * ({@code OR(G5={"Sàng 3.CS";"Sàng 1.CS";"Sàng 2B.CS"})}). Giữ nguyên
     * cách so theo TÊN để khớp bảng tính; nếu sau này ba nơi này đổi tên thì
     * phải sửa ở đây — đã ghi lại để không phải đi tìm.
     */
    private static final List<String> SCREEN_RECEIVING_POINTS =
            List.of("Sàng 3.CS", "Sàng 1.CS", "Sàng 2B.CS");

    private static final String KPMB = "KPMB";

    /**
     * {@code BT5} — Mã hoá hàng.
     *
     * <pre>
     * BT5 = IF(K5=0, "", INDEX(Mohinh_TheTrong, MATCH(K5,…), MATCH("TTL_CLH",…)))
     * </pre>
     *
     * <p>Tức chính là <b>TTL CLH</b> của chủng loại hàng — trong hệ này đã là
     * một khoá ngoại sau mục S1, nên chỉ việc đọc tên.
     */
    public static String cargoCode(String ttlClhName) {
        return trim(ttlClhName);
    }

    /**
     * {@code BU5} — Mã hàng TTL.
     *
     * <pre>
     * SWITCH(BT5,
     *   "xitNK",    IF(OR(G5={"Sàng 3.CS";"Sàng 1.CS";"Sàng 2B.CS"}), "daloaiNK", "xitCTNB"),
     *   "DAT_thai", IF(CQ5="PA.PCMB.S+90", "thai.PCMB", BT5),
     *   BT5)
     * </pre>
     *
     * <p>Lưu ý bản docx ghi {@code daloai.NK} (có dấu chấm) còn bảng tính ghi
     * {@code daloaiNK} (không dấu chấm). Theo BẢNG TÍNH, đúng quy ước đã thống
     * nhất của dự án.
     *
     * @param cargoCode         BT5 — mã hoá hàng
     * @param receivingPointName G5 — tên nơi nhận tải
     * @param seamGroupCode     CQ5 — mã nhóm vỉa
     */
    public static String cargoTtlCode(String cargoCode, String receivingPointName, String seamGroupCode) {
        String code = trim(cargoCode);
        if (code.isEmpty()) return "";

        if ("xitNK".equalsIgnoreCase(code)) {
            boolean atScreen = SCREEN_RECEIVING_POINTS.stream()
                    .anyMatch(p -> p.equalsIgnoreCase(trim(receivingPointName)));
            return atScreen ? "daloaiNK" : "xitCTNB";
        }
        if ("DAT_thai".equalsIgnoreCase(code)) {
            return SEAM_GROUP_PCMB.equalsIgnoreCase(trim(seamGroupCode)) ? "thai.PCMB" : code;
        }
        return code;
    }

    /**
     * {@code BV5} — Vỉa KPMB: {@code IF(RIGHT(CQ5,4)="KPMB","KPMB","")}.
     *
     * <p>Chỉ xét BỐN KÝ TỰ CUỐI của mã nhóm vỉa, không phải chứa ở giữa.
     */
    public static String seamKpmb(String seamGroupCode) {
        String v = trim(seamGroupCode);
        return v.length() >= 4 && v.regionMatches(true, v.length() - 4, KPMB, 0, 4) ? KPMB : "";
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }
}
