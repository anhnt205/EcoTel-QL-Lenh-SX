package com.ecotel.thong_ke_cao_son.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Toan bo mot luoi trong mot lan goi.
 *
 * <p>Tra ca luoi thay vi phan trang: mot luoi lon nhat cung chi vai nghin o,
 * ma nguoi nhap can nhin duoc canh nhau moi so sanh duoc — phan trang o day
 * lam mat dung cong dung cua man hinh.
 */
@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MatrixGridResponse {

    /** Id của PHIÊN BẢN đang xem — cần khi sửa để không ghi nhầm phiên bản. */
    Long versionId;
    java.time.LocalDate effectiveFrom;
    java.time.LocalDate effectiveTo;
    String versionLabel;

    String code;
    String name;
    String rowAxisLabel;
    String colAxisLabel;
    String valueLabel;
    String rowSourcePath;
    String colSourcePath;
    boolean numericRowAxis;
    boolean numericColAxis;
    int valueScale;
    String note;

    List<AxisEntry> rows;
    List<AxisEntry> cols;

    /**
     * Gia tri o, long hai cap: rowKey -> (colKey -> value).
     *
     * <p>O chua khai bao thi KHONG co khoa, chu khong phai bang 0 — hai
     * trang thai nay khac nhau ve nghiep vu.
     */
    Map<String, Map<String, BigDecimal>> cells;

    @Getter
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class AxisEntry {
        String key;
        String label;
        BigDecimal numericValue;
        int sortOrder;
    }
}
