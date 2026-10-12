package com.ecotel.thong_ke_cao_son.dto.request;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Thuộc tính phục vụ tính sản lượng của một thiết bị (mục S3).
 *
 * <p>Chỉ chứa các trường THUỘC PHẦN SẢN LƯỢNG. Cố tình không cho sửa mã, tên,
 * đơn vị… ở đây: đó là dữ liệu gốc của thiết bị, sửa lẫn vào sẽ khiến màn
 * "thuộc tính sản lượng" âm thầm trở thành màn sửa thiết bị.
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeviceProductionAttributesRequest {

    /** Dùng khi nhập hàng loạt: xác định thiết bị theo MÃ thay vì id. */
    String code;

    String carRenovation;
    /** @deprecated dùng {@link #vehicleRankId} — giữ để nhập file cũ vẫn chạy. */
    @Deprecated
    String vehicleClass;
    String qualityLevel;
    /** Chủng loại xe (NL) — gốc khoá cột ĐMNL (QĐ-11). */
    Long fuelClassId;
    /** Chủng loại xe — gốc khoá cột Mô hình và Năng suất xe (QĐ-11). */
    Long vehicleTypeId;
    /** Hạng xe — thay cho chuỗi {@link #vehicleClass}. */
    Long vehicleRankId;
    Long categoryClassId;
    BigDecimal bucketCapacity;
}
