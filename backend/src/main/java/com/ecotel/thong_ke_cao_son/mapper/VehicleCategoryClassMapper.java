package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleCategoryClassRequest;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleCategoryClassResponse;
import com.ecotel.thong_ke_cao_son.model.VehicleCategoryClass;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface VehicleCategoryClassMapper {

    VehicleCategoryClassResponse toResponse(VehicleCategoryClass entity);

    VehicleCategoryClass toEntity(VehicleCategoryClassRequest request);

    void updateEntity(@MappingTarget VehicleCategoryClass entity, VehicleCategoryClassRequest request);
}
