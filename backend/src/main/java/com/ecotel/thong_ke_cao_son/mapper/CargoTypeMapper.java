package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CargoTypeMapper {
    CargoTypeResponse toResponse(CargoType cargoType);
}
