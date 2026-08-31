package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Kết quả LƯỢT 1 của một chuyến — các giá trị chưa áp hệ số trắc địa.
 *
 * <p>Vì sao phải tách riêng lượt 1: hệ số trắc địa được tính từ TỔNG của cả
 * kỳ chia cho số trắc địa, mà tổng ấy lại cộng từ chính các giá trị dưới đây.
 * Nên không thể tính xong một chuyến trong một lần — xem
 * {@code docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md} mục 4.
 */
@Getter
@Builder
public class TripBaseResult {

    private final TransportReportTrip trip;

    /** Ngày sản xuất của chuyến — mốc tra mọi tham số theo thời gian (QĐ-04). */
    private final LocalDate productionDate;

    /** Khoá ghép Nhóm vỉa + Máy xúc — khoá gộp khi tổng hợp và khi tra STD. */
    private final String seamGroupExcavatorKey;

    /** Sản phẩm nghiệm thu (cột AG) — quyết định nhánh tính và bảng STD nào. */
    private final String acceptanceProduct;

    /** Phân loại THAN hay không — quyết định nhánh trừ vơi. */
    private final boolean coal;

    /** Tỷ trọng (tấn/m3) đã dùng, sau khi ưu tiên giá trị tạm tính. */
    private final BigDecimal density;

    /** Mô hình (m3/chuyến) đã dùng, đã nhân Roda và làm tròn 3 chữ số. */
    private final BigDecimal model;

    /** AL — Tổng m3. */
    private final BigDecimal totalM3;

    /** AM — Tổng KLVC (tấn). */
    private final BigDecimal totalTon;

    /** AN — Tổng Tkm. */
    private final BigDecimal totalTkm;

    /** BT — Mã hoá hàng (chính là TTL CLH của chủng loại hàng). */
    private final String cargoCode;

    /** BU — Mã hàng TTL. */
    private final String cargoTtlCode;

    /** BV — Vỉa KPMB; rỗng nếu nhóm vỉa không kết thúc bằng KPMB. */
    private final String seamKpmb;

    /** Đá thải (tấn) đã dùng. */
    private final BigDecimal wasteRockTon;
}
