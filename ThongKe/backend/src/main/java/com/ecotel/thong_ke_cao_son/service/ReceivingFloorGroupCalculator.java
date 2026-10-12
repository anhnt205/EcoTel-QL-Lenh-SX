package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import com.ecotel.thong_ke_cao_son.service.production.ProductionKeys;
import org.springframework.stereotype.Component;

@Component
public class ReceivingFloorGroupCalculator {

    /**
     * Tính "Nhóm tầng nhận tải" — cột {@code AK} của bảng tính:
     *
     * <pre>
     * AK5 = IF(D5="KC", IF(F5&lt;-195, -200, IF(F5&lt;0, -1+TRUNC((F5+1)/15), TRUNC(F5/15))*15),
     *                   IF(F5&lt;0, -1+TRUNC((F5+1)/15), TRUNC(F5/15))*15)
     * </pre>
     *
     * <p>Nhánh riêng {@code < -195 → -200} phụ thuộc <b>NHÓM khu vực</b>
     * {@code KC}, không phải tên khu vực. Trước 07/09/2026 hàm này so tên với
     * hằng {@code "Khe Chàm"} — sai: đó chỉ là một khu vực trong nhóm, và
     * danh mục thật có nhiều khu (QĐ-13).
     *
     * <p>Lưu ý: phép chia số nguyên trong Java (int/int) đã tự động TRUNC
     * (làm tròn về 0), khớp với hành vi hàm TRUNC trong Excel. Và {@code *15}
     * nằm TRONG nhánh trong cùng, nên {@code -200} không bị nhân — giữ đúng
     * như bảng tính.
     */
    public Integer calculate(ExcavationArea excavationArea, Integer receivingFloor) {
        if (receivingFloor == null) {
            return null;
        }

        String group = excavationArea == null
                ? ProductionKeys.AREA_KC
                : ProductionKeys.areaGroup(excavationArea.getAreaGroup(), excavationArea.getCode());

        if (ProductionKeys.AREA_KC.equals(group) && receivingFloor < -195) {
            return -200;
        }

        if (receivingFloor < 0) {
            return (-1 + (receivingFloor + 1) / 15) * 15;
        }

        return (receivingFloor / 15) * 15;
    }
}
