package com.ecotel.thong_ke_cao_son.enums;

import java.util.Arrays;

/**
 * Ba dạng điều kiện của HS Than (CN-NK) (chủ dự án chốt 2026-11-16): mỗi dạng có các trường riêng. Công thức xét
 * <b>theo thứ tự từ trên xuống, thoả điều kiện nào thì không xét tiếp</b> — thứ tự đó chính là {@link #order}:
 * <ol>
 *   <li>Chủng loại xe (vd VolvoA40F, VolvoA40G) → 1,02</li>
 *   <li>Khu vực xúc + Chủng loại hàng + Chủng loại xe (vd CS + SPNT.Baichua + HD465*) → 0,9</li>
 *   <li>Cung độ toàn tuyến nhỏ hơn + Chủng loại xe (vd &lt; 1,5 + HD465-7R) → 1,15</li>
 * </ol>
 */
public enum FuelCoalCondition {
    VEHICLE("Chủng loại xe", 1),
    AREA_CARGO_VEHICLE("Khu vực + Hàng + Xe", 2),
    DISTANCE_VEHICLE("Cung độ + Xe", 3);

    private final String label;
    private final int order;

    FuelCoalCondition(String label, int order) {
        this.label = label;
        this.order = order;
    }

    public String getLabel() {
        return label;
    }

    /** Thứ tự xét giữa các dạng điều kiện (số nhỏ xét trước). */
    public int getOrder() {
        return order;
    }

    public boolean usesAreaAndCargo() {
        return this == AREA_CARGO_VEHICLE;
    }

    public boolean usesDistance() {
        return this == DISTANCE_VEHICLE;
    }

    /** Tra theo nhãn (không phân biệt hoa thường); không khớp thì {@code null}. */
    public static FuelCoalCondition fromLabel(String text) {
        if (text == null) return null;
        String t = text.trim();
        return Arrays.stream(values())
                .filter(v -> v.label.equalsIgnoreCase(t) || v.name().equalsIgnoreCase(t))
                .findFirst().orElse(null);
    }
}
