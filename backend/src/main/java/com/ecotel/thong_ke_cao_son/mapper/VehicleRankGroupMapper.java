package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleRankGroupRequest;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleRankGroupResponse;
import com.ecotel.thong_ke_cao_son.model.VehicleRankGroup;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface VehicleRankGroupMapper {

    VehicleRankGroupResponse toResponse(VehicleRankGroup entity);

    VehicleRankGroup toEntity(VehicleRankGroupRequest request);

    void updateEntity(@MappingTarget VehicleRankGroup entity, VehicleRankGroupRequest request);
}
