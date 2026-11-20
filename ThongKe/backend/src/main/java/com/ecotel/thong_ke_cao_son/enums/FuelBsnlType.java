package com.ecotel.thong_ke_cao_son.enums;

import java.util.Arrays;

/** Bảy loại BSNL có công thức (chủ dự án chốt 2026-11-16); {@link #label} là chữ hiện trên giao diện và trao đổi với frontend. */
public enum FuelBsnlType {
    RODA("Roda"),
    RAINY_DAY("Ngày mưa"),
    SUPPLEMENTARY("Bổ túc"),
    MAINTENANCE("SC, BD"),
    OTHER("Khác"),
    SPNT("SPNT"),
    MUD("Bùn");

    private final String label;

    FuelBsnlType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    // ── Trường điều kiện phù hợp với từng loại (giao diện chỉ hiện các trường này; backend xoá trắng phần còn lại) ──

    /** Roda / Ngày mưa / Bổ túc đã có cờ riêng của chuyến → chỉ cần Thời gian + Tỷ lệ, không điều kiện. */
    private boolean flagOnly() {
        return this == RODA || this == RAINY_DAY || this == SUPPLEMENTARY;
    }

    public boolean usesVehicleType() {
        return this == MAINTENANCE || this == SPNT || this == MUD;
    }

    public boolean usesVehicleCode() {
        return this == OTHER;
    }

    public boolean usesCargo() {
        return this == SPNT || this == MUD;
    }

    /** Có nhiều dòng điều kiện cần xét theo thứ tự → có Thứ tự xét. */
    public boolean usesPriority() {
        return !flagOnly();
    }

    public boolean usesRounding() {
        return this == MUD;
    }

    /** Tra theo nhãn (không phân biệt hoa thường, bỏ khoảng trắng thừa); không khớp thì {@code null}. */
    public static FuelBsnlType fromLabel(String text) {
        if (text == null) return null;
        String t = text.trim();
        return Arrays.stream(values())
                .filter(v -> v.label.equalsIgnoreCase(t) || v.name().equalsIgnoreCase(t))
                .findFirst().orElse(null);
    }
}
