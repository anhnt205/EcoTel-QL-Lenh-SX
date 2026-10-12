package com.ecotel.thong_ke_cao_son.dto.response;

import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.enums.DeviceStatus;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeviceResponse {
    Long id;
    String code;
    String name;
    Long departmentId;
    String departmentName;
    String vehicleNumber;
    Long categoryId;
    String categoryName;
    DeviceGroup categoryGroup;
    Long materialId;
    String materialName;
    String fuelType;
    Double capacity;
    Double power;
    DeviceStatus status;
    Double longitude;
    Double latitude;
    String note;

    // Thuộc tính phục vụ tính sản lượng (S3)
    String carRenovation;
    String vehicleClass;
    String qualityLevel;
    Long fuelClassId;
    String fuelClassName;
    Long vehicleTypeId;
    String vehicleTypeName;
    Long vehicleRankId;
    String vehicleRankName;
    Long categoryClassId;
    String categoryClassName;
    java.math.BigDecimal bucketCapacity;

    List<String> files;
    Long createdById;
    String createdByName;
    Long updatedById;
    String updatedByName;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
