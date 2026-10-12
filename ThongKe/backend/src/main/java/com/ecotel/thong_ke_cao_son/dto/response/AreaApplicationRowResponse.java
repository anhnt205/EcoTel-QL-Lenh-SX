package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Một dòng của danh mục <b>"AP Tdia (m3-tấn-tkm)"</b> (chỉ xem) — gộp theo
 * tháng, khoá "Nhóm vỉa + Máy xúc": tương ứng đúng sheet cùng tên trong
 * workbook gốc.
 *
 * <p>Dựng từ các dòng {@code SurveyCoefficient} (kind {@code AP_TDIA}, đã
 * được "Tính lại kỳ" ở màn Báo cáo thống kê sinh sẵn) của mọi kỳ nằm trong
 * tháng đang xem — KHÔNG tính lại gì mới, chỉ gộp và PIVOT ba dòng cùng khoá
 * (một dòng mỗi {@code acceptanceProduct}: {@code Dat_CN}/{@code Dat_SX}/
 * {@code Than_SX}, xem {@code ProductionKeys}) thành MỘT dòng ba khối cột,
 * đúng hình chủ dự án đưa. "Máy xúc" không có sẵn trên SurveyCoefficient
 * (chỉ có chuỗi khoá đã ghép) — tra ngược qua danh mục STD theo khoá.
 *
 * <p>Nhiều kỳ trong cùng tháng (QĐ-05 cho phép một tháng chia nhiều kỳ): các
 * cột "Tổng" CỘNG DỒN qua các kỳ; "Số Trắc địa" lấy nguyên (không cộng dồn —
 * đó là giá trị KHAI BÁO ở danh mục STD, không phải số phát sinh); "Hệ số"
 * tính lại = Số Trắc địa ÷ Tổng đã cộng dồn. Đây là suy luận hợp lý nhất từ
 * đặc tả hiện có — CHƯA được chủ dự án xác nhận, sẽ sửa lại khi có công thức
 * chính thức.
 */
@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AreaApplicationRowResponse {

    int year;
    int month;
    String excavatorCode;
    String seamGroupExcavatorKey;

    // ── Đất CN ──────────────────────────────────────────────────────────────
    BigDecimal earthCnTotalM3;
    BigDecimal earthCnTotalTon;
    BigDecimal earthCnTotalTkm;

    // ── Đất SX ──────────────────────────────────────────────────────────────
    BigDecimal earthSxTotalM3;
    BigDecimal earthSxTotalTon;
    BigDecimal earthSxTotalTkm;

    // ── Than ────────────────────────────────────────────────────────────────
    BigDecimal coalTotalM3;
    BigDecimal coalTotalTon;
    BigDecimal coalTotalTkm;

    // ── Số Trắc địa ─────────────────────────────────────────────────────────
    BigDecimal earthCnSurveyM3;
    BigDecimal earthCnSurveyTon;
    BigDecimal earthCnSurveyTkm;
    BigDecimal earthSxSurveyM3;
    BigDecimal earthSxSurveyTon;
    BigDecimal earthSxSurveyTkm;
    BigDecimal coalSurveyM3;
    BigDecimal coalSurveyTon;
    BigDecimal coalSurveyTkm;

    // ── Hệ số ───────────────────────────────────────────────────────────────
    BigDecimal earthCnHsM3;
    BigDecimal earthCnHsTon;
    BigDecimal earthCnHsTkm;
    BigDecimal earthSxHsM3;
    BigDecimal earthSxHsTon;
    BigDecimal earthSxHsTkm;
    BigDecimal coalHsM3;
    BigDecimal coalHsTon;
    BigDecimal coalHsTkm;
}
