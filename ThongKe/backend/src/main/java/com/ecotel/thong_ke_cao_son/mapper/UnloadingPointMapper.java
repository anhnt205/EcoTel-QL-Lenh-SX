package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.UnloadingPointRequest;
import com.ecotel.thong_ke_cao_son.dto.response.UnloadingPointResponse;
import com.ecotel.thong_ke_cao_son.model.UnloadingPoint;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UnloadingPointMapper {

    UnloadingPointResponse toResponse(UnloadingPoint entity);

    UnloadingPoint toEntity(UnloadingPointRequest request);

    void updateEntity(@MappingTarget UnloadingPoint entity, UnloadingPointRequest request);
}
