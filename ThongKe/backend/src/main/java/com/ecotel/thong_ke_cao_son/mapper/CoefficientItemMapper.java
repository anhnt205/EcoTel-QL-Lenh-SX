package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.CoefficientItemRequest;
import com.ecotel.thong_ke_cao_son.dto.response.CoefficientItemResponse;
import com.ecotel.thong_ke_cao_son.model.CoefficientItem;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CoefficientItemMapper {

    CoefficientItemResponse toResponse(CoefficientItem entity);

    CoefficientItem toEntity(CoefficientItemRequest request);

    void updateEntity(@MappingTarget CoefficientItem entity, CoefficientItemRequest request);
}
