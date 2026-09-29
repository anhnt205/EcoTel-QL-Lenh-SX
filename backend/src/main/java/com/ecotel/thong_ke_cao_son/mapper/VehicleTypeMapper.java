package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleTypeRequest;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleTypeResponse;
import com.ecotel.thong_ke_cao_son.model.VehicleType;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface VehicleTypeMapper {

    VehicleTypeResponse toResponse(VehicleType entity);

    VehicleType toEntity(VehicleTypeRequest request);

    void updateEntity(@MappingTarget VehicleType entity, VehicleTypeRequest request);
}
