package com.ecotel.thong_ke_cao_son.enums;

/**
 * Các nhóm hệ số của chuỗi ĐMNL và BSNL (chủ dự án chốt 2026-11-16: "tạo động" thay cho hằng số trong code).
 * Cùng nằm một bảng {@code fuel_norm_factors}, mỗi nhóm một danh mục riêng trên giao diện.
 */
public enum FuelNormFactorKind {
    /** Hệ số theo MÙA: tháng nào thì nhân bao nhiêu (bảng tính cũ: tháng 6–9 → 1,03). Chưa khai = 1. */
    SEASON,
    /** Hệ số theo HẠNG XE (bảng tính cũ: A 0,97 · B 1 · C1 1,04 · khác 1,06). Chưa khai = 1. */
    VEHICLE_RANK,
    /** Hệ số theo CẢI TẠO BEN: nhân khi xe được đánh dấu Cải tạo toa (bảng tính cũ: 1,03). Chưa khai = 1. */
    CAR_RENOVATION,
    /** HS Than (CN-NK): các dòng điều kiện xét theo thứ tự ưu tiên, dòng thoả đầu tiên thắng. Không dòng nào thoả = 1. */
    COAL_CN_NK,
    /** Hệ số BSNL (bù sung nhiên liệu): tỷ lệ × Nhiên liệu tiêu hao theo ĐM, theo loại BSNL và điều kiện. Không dòng nào thoả = 0. */
    BSNL
}
