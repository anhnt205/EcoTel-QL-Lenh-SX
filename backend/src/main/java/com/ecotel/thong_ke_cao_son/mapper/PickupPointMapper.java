package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.PickupPointRequest;
import com.ecotel.thong_ke_cao_son.dto.response.PickupPointResponse;
import com.ecotel.thong_ke_cao_son.model.PickupPoint;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PickupPointMapper {

    PickupPointResponse toResponse(PickupPoint entity);

    PickupPoint toEntity(PickupPointRequest request);

    void updateEntity(@MappingTarget PickupPoint entity, PickupPointRequest request);
}
