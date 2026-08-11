package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationTripReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationTripReportTripResponse;
import com.ecotel.thong_ke_cao_son.model.ExcavationTripReport;
import com.ecotel.thong_ke_cao_son.model.ExcavationTripReportTrip;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExcavationTripReportMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shift", ignore = true)
    @Mapping(target = "excavatorDevice", ignore = true)
    @Mapping(target = "receivingLocation", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "fuelUsed", ignore = true)
    @Mapping(target = "trips", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ExcavationTripReport toEntity(ExcavationTripReportRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shift", ignore = true)
    @Mapping(target = "excavatorDevice", ignore = true)
    @Mapping(target = "receivingLocation", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "fuelUsed", ignore = true)
    @Mapping(target = "trips", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(ExcavationTripReportRequest request, @MappingTarget ExcavationTripReport report);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "excavationTripReport", ignore = true)
    @Mapping(target = "vehicle", ignore = true)
    @Mapping(target = "dropOffLocation", ignore = true)
    @Mapping(target = "cargoType", ignore = true)
    @Mapping(target = "cargoGroup", ignore = true)
    @Mapping(target = "loadLevel", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ExcavationTripReportTrip toTripEntity(ExcavationTripReportTripRequest tripRequest);

    @Mapping(target = "shiftId", source = "shift.id")
    @Mapping(target = "shiftName", source = "shift.name")
    @Mapping(target = "excavatorDeviceId", source = "excavatorDevice.id")
    @Mapping(target = "excavatorDeviceCode", source = "excavatorDevice.code")
    @Mapping(target = "excavatorDeviceName", source = "excavatorDevice.name")
    @Mapping(target = "receivingLocationId", source = "receivingLocation.id")
    @Mapping(target = "receivingLocationName", source = "receivingLocation.name")
    @Mapping(target = "employeeId", source = "employee.id")
    @Mapping(target = "employeeSalaryCode", source = "employee.salaryCode")
    @Mapping(target = "employeeFullName", source = "employee.fullName")
    @Mapping(target = "employeeDepartmentName", source = "employee.department.name")
    ExcavationTripReportResponse toResponse(ExcavationTripReport report);

    @Mapping(target = "vehicleId", source = "vehicle.id")
    @Mapping(target = "vehicleCode", source = "vehicle.code")
    @Mapping(target = "vehicleName", source = "vehicle.name")
    @Mapping(target = "vehicleDepartmentName", source = "vehicle.department.name")
    @Mapping(target = "vehicleCategoryName", source = "vehicle.category.name")
    @Mapping(target = "dropOffLocationId", source = "dropOffLocation.id")
    @Mapping(target = "dropOffLocationName", source = "dropOffLocation.name")
    @Mapping(target = "cargoTypeId", source = "cargoType.id")
    @Mapping(target = "cargoTypeName", source = "cargoType.name")
    @Mapping(target = "cargoGroupId", source = "cargoGroup.id")
    @Mapping(target = "cargoGroupName", source = "cargoGroup.name")
    @Mapping(target = "loadLevelType", source = "loadLevel.type")
    @Mapping(target = "loadLevelCustomValue", source = "loadLevel.customValue")
    ExcavationTripReportTripResponse toTripResponse(ExcavationTripReportTrip trip);
}
