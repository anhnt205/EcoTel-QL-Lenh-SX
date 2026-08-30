package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.CargoTypeRequest;
import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CargoTypeMapper {

    @Mapping(target = "cargoGroupId", source = "cargoGroup.id")
    @Mapping(target = "cargoGroupName", source = "cargoGroup.name")
    CargoTypeResponse toResponse(CargoType cargoType);

    /** cargoGroup do service tự resolve từ cargoGroupId. */
    @Mapping(target = "cargoGroup", ignore = true)
    @Mapping(target = "id", ignore = true)
    CargoType toEntity(CargoTypeRequest request);

    @Mapping(target = "cargoGroup", ignore = true)
    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget CargoType entity, CargoTypeRequest request);
}
