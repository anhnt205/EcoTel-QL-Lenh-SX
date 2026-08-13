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
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shift", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "department", ignore = true)
    @Mapping(target = "fuelUsed", ignore = true)
    @Mapping(target = "trips", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    TransportReport toEntity(TransportReportRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shift", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "department", ignore = true)
    @Mapping(target = "fuelUsed", ignore = true)
    @Mapping(target = "trips", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(TransportReportRequest request, @MappingTarget TransportReport report);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "transportReport", ignore = true)
    @Mapping(target = "vehicle", ignore = true)
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
    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "employeeSalaryCode", source = "employee.salaryCode")
    @Mapping(target = "employeeFullName", source = "employee.fullName")
    @Mapping(target = "employeeDepartmentName", source = "employee.department.name")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    TransportReportResponse toResponse(TransportReport report);

    @Mapping(target = "vehicleId", source = "vehicle.id")
    @Mapping(target = "vehicleCode", source = "vehicle.code")
    @Mapping(target = "vehicleName", source = "vehicle.name")
    @Mapping(target = "vehicleDepartmentName", source = "vehicle.department.name")
    @Mapping(target = "vehicleCategoryName", source = "vehicle.category.name")
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
