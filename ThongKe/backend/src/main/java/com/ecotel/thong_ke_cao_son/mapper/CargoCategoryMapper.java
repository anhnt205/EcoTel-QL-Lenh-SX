package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.CargoCategoryRequest;
import com.ecotel.thong_ke_cao_son.dto.response.CargoCategoryResponse;
import com.ecotel.thong_ke_cao_son.model.CargoCategory;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CargoCategoryMapper {

    CargoCategoryResponse toResponse(CargoCategory entity);

    CargoCategory toEntity(CargoCategoryRequest request);

    void updateEntity(@MappingTarget CargoCategory entity, CargoCategoryRequest request);
}
