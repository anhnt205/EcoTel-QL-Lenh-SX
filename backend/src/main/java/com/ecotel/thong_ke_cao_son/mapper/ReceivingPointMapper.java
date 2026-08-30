package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ReceivingPointRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ReceivingPointResponse;
import com.ecotel.thong_ke_cao_son.model.ReceivingPoint;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ReceivingPointMapper {

    ReceivingPointResponse toResponse(ReceivingPoint entity);

    ReceivingPoint toEntity(ReceivingPointRequest request);

    void updateEntity(@MappingTarget ReceivingPoint entity, ReceivingPointRequest request);
}
