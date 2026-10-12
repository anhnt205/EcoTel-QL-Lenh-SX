package com.ecotel.thong_ke_cao_son.service.production;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kết quả nhánh NHIÊN LIỆU + NĂNG SUẤT của một chuyến.
 *
 * <p>Giữ lại từng bước trung gian chứ không chỉ con số cuối: chuỗi này nhân
 * liên tiếp 5 hệ số rồi cộng 8 khoản bù, nên khi số liệu lệch thì không thể
 * lần ngược nếu chỉ có tổng.
 */
@Getter
@Builder
public class FuelResult {

    /** AZ — ĐMNL nội suy từ lưới DMNL. */
    private final BigDecimal normInterpolated;
    /** BA — sau hệ số mùa (tháng 6–9 nhân 1,03). */
    private final BigDecimal normSeasonal;
    /** BC — sau hệ số hạng xe. */
    private final BigDecimal normVehicleClass;
    /** BD — sau hệ số cải tạo toa. */
    private final BigDecimal normCarRenovation;
    /** BE — HS Than (CN-NK). */
    private final BigDecimal coalCnNkFactor;
    /** BF — ĐMNL xe (điều chỉnh tháng). */
    private final BigDecimal normFinal;
    /** BG — Nhiên liệu tiêu hao theo ĐM (lít) = Tổng Tkm × ĐMNL / 1000. */
    private final BigDecimal baseConsumption;

    /** BH…BO — tám khoản bù, giữ nguyên thứ tự của bảng tính. */
    private final BigDecimal bsnlRoda;
    private final BigDecimal bsnlRainyDay;
    private final BigDecimal bsnlSupplementary;
    private final BigDecimal bsnlMaintenance;
    private final BigDecimal bsnlOther;
    private final BigDecimal bsnlSpnt;
    private final BigDecimal bsnlMud;
    private final BigDecimal bsnlSpntCn;

    /** BP — ĐMNL xe (QĐ 1828) = tiêu hao theo ĐM + 8 khoản bù. */
    private final BigDecimal totalBeforeAdjustment;
    /** EC — HS điều chỉnh NLĐM. */
    private final BigDecimal adjustmentFactor;
    /** BQ — NLĐM hiện hành. */
    private final BigDecimal currentNorm;

    /** BR — Định mức năng suất xe tải (chuyến/ca). */
    private final BigDecimal productivityNorm;

    /**
     * Những gì không tính được và vì sao.
     *
     * <p>Nhánh nhiên liệu KHÔNG chặn cả kỳ khi thiếu dữ liệu: sản lượng vẫn
     * tính được mà không cần nó. Nên thiếu thì bỏ trống và ghi cảnh báo, thay
     * vì ném lỗi làm hỏng luôn phần đã chạy đúng.
     */
    private final List<String> warnings;
}
