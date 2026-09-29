package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleFuelClassRequest;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleFuelClassResponse;
import com.ecotel.thong_ke_cao_son.model.VehicleFuelClass;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface VehicleFuelClassMapper {

    VehicleFuelClassResponse toResponse(VehicleFuelClass entity);

    VehicleFuelClass toEntity(VehicleFuelClassRequest request);

    void updateEntity(@MappingTarget VehicleFuelClass entity, VehicleFuelClassRequest request);
}
