package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportTripResponse;
import com.ecotel.thong_ke_cao_son.model.TransportReport;
import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TransportReportMapper {


    // Chỉ map các field đơn giản (không cần query DB).
    // Các quan hệ (shift, device, employee, trips) set thủ công ở Service
    // vì cần resolve từ ID sang Entity thật (findById) — MapStruct không tự query DB.
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shift", ignore = true)
    @Mapping(target = "device", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "fuelUsed", ignore = true) // tính tự động qua recalculateFuelUsed(), không nhận từ request
    @Mapping(target = "trips", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    TransportReport toEntity(TransportReportRequest request);

    // Cập nhật entity đã có sẵn (dùng cho update) — giữ nguyên id/createdAt,
    // chỉ ghi đè các field đơn giản.
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shift", ignore = true)
    @Mapping(target = "device", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "fuelUsed", ignore = true)
    @Mapping(target = "trips", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(TransportReportRequest request, @MappingTarget TransportReport report);

    // Trip: chỉ map field đơn giản (receivingFloor, unloadingFloor, các khoảng cách, tripCount).
    // Toàn bộ quan hệ (excavationArea, excavator, loadingPoint, unloadingPoint,
    // cargoType, cargoGroup), receivingFloorGroup (tính toán), loadLevel (logic điều kiện),
    // và transportReport (liên kết cha) đều set thủ công ở Service.
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "transportReport", ignore = true)
    @Mapping(target = "excavationArea", ignore = true)
    @Mapping(target = "excavator", ignore = true)
    @Mapping(target = "loadingPoint", ignore = true)
    @Mapping(target = "unloadingPoint", ignore = true)
    @Mapping(target = "cargoType", ignore = true)
    @Mapping(target = "cargoGroup", ignore = true)
    @Mapping(target = "receivingFloorGroup", ignore = true)
    @Mapping(target = "loadLevel", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    TransportReportTrip toTripEntity(TransportReportTripRequest tripRequest);

    @Mapping(target = "shiftId", source = "shift.id")
    @Mapping(target = "shiftName", source = "shift.name")
    @Mapping(target = "deviceId", source = "device.id")
    @Mapping(target = "deviceCode", source = "device.code")
    @Mapping(target = "deviceName", source = "device.name")
    @Mapping(target = "deviceDepartmentName", source = "device.department.name")
    @Mapping(target = "deviceCategoryName", source = "device.category.name")
    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "employeeSalaryCode", source = "employee.salaryCode")
    @Mapping(target = "employeeFullName", source = "employee.fullName")
    @Mapping(target = "employeeDepartmentName", source = "employee.department.name")
    TransportReportResponse toResponse(TransportReport report);

    @Mapping(target = "excavationAreaId", source = "excavationArea.id")
    @Mapping(target = "excavationAreaName", source = "excavationArea.name")
    @Mapping(target = "excavatorDeviceId", source = "excavator.id")
    @Mapping(target = "excavatorDeviceName", source = "excavator.name")
    @Mapping(target = "loadingPointId", source = "loadingPoint.id")
    @Mapping(target = "loadingPointName", source = "loadingPoint.name")
    @Mapping(target = "unloadingPointId", source = "unloadingPoint.id")
    @Mapping(target = "unloadingPointName", source = "unloadingPoint.name")
    @Mapping(target = "cargoTypeId", source = "cargoType.id")
    @Mapping(target = "cargoTypeName", source = "cargoType.name")
    @Mapping(target = "cargoGroupId", source = "cargoGroup.id")
    @Mapping(target = "cargoGroupName", source = "cargoGroup.name")
    @Mapping(target = "loadLevelType", source = "loadLevel.type")
    @Mapping(target = "loadLevelCustomValue", source = "loadLevel.customValue")
    TransportReportTripResponse toTripResponse(TransportReportTrip trip);
}
