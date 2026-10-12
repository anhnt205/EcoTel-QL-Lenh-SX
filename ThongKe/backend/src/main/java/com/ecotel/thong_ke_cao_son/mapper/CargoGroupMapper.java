package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.CargoGroupRequest;
import com.ecotel.thong_ke_cao_son.dto.response.CargoGroupResponse;
import com.ecotel.thong_ke_cao_son.model.CargoGroup;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CargoGroupMapper {

    CargoGroupResponse toResponse(CargoGroup cargoGroup);

    @Mapping(target = "id", ignore = true)
    CargoGroup toEntity(CargoGroupRequest request);

    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget CargoGroup entity, CargoGroupRequest request);
}
