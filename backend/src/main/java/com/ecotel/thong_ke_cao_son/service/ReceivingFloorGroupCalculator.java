package com.ecotel.thong_ke_cao_son.service;

import org.springframework.stereotype.Component;

@Component
public class ReceivingFloorGroupCalculator {

    private static final String KHE_CHAM_NAME = "Khe Chàm";

    /**
     * Tính "Nhóm tầng nhận tải" theo công thức:
     * - Nếu excavationAreaName = "Khe Chàm":
     *     floor < -195         -> -200
     *     floor < 0            -> (-1 + TRUNC((floor+1)/15)) * 15
     *     floor >= 0           -> TRUNC(floor/15) * 15
     * - Ngược lại:
     *     floor < 0            -> (-1 + TRUNC((floor+1)/15)) * 15
     *     floor >= 0           -> TRUNC(floor/15) * 15
     *
     * Lưu ý: phép chia số nguyên trong Java (int/int) đã tự động TRUNC
     * (làm tròn về 0), khớp với hành vi hàm TRUNC trong Excel.
     */
    public Integer calculate(String excavationAreaName, Integer receivingFloor) {
        if (receivingFloor == null) {
            return null;
        }

        boolean isKheCham = KHE_CHAM_NAME.equalsIgnoreCase(
                excavationAreaName != null ? excavationAreaName.trim() : "");

        if (isKheCham && receivingFloor < -195) {
            return -200;
        }

        if (receivingFloor < 0) {
            return (-1 + (receivingFloor + 1) / 15) * 15;
        }

        return (receivingFloor / 15) * 15;
    }
}
