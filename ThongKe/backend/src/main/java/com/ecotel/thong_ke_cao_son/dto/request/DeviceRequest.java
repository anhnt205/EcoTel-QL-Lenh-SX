package com.ecotel.thong_ke_cao_son.dto.request;

import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.enums.DeviceStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/**
 * Thêm/sửa Xe / Máy (thiết bị). Chỉ các trường nhập tay cơ bản; thuộc tính sản lượng (hạng xe,
 * chủng loại xe NL...) vẫn nhập ở màn Thuộc tính sản lượng.
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeviceRequest {

    String code;

    String name;

    String vehicleNumber;

    /** Loại xe / loại máy (nhóm thiết bị). */
    Long categoryId;

    /** Chủng loại (mẫu thiết bị). */
    Long materialId;

    /** Đơn vị quản lý. */
    Long departmentId;

    String fuelType;

    Double capacity;

    /** Để trống = giữ nguyên (sửa) hoặc "Chờ điều động" (thêm mới). */
    DeviceStatus status;

    String note;

    /**
     * Nhóm màn đang sửa (XE / MAY) — quyết định bộ thuộc tính sản lượng được ghi: XE ghi cải tạo toa, chất lượng, chủng loại xe (NL),
     * chủng loại xe, hạng xe, chủng loại xe + phân loại; MAY ghi gầu xúc. Để trống = không đụng tới thuộc tính sản lượng.
     */
    DeviceGroup categoryGroup;

    // ── Thuộc tính sản lượng (gộp từ màn "Thuộc tính sản lượng") ──
    String carRenovation;
    String qualityLevel;
    /** Chủng loại xe (NL) — gốc khoá cột ĐMNL. */
    Long fuelClassId;
    /** Chủng loại xe — gốc khoá cột Mô hình và Năng suất xe. */
    Long vehicleTypeId;
    Long vehicleRankId;
    /** Chủng loại xe + Phân loại. */
    Long categoryClassId;
    java.math.BigDecimal bucketCapacity;
}
