package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.AcceptanceProductRequest;
import com.ecotel.thong_ke_cao_son.dto.response.AcceptanceProductResponse;
import com.ecotel.thong_ke_cao_son.model.AcceptanceProduct;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface AcceptanceProductMapper {

    AcceptanceProductResponse toResponse(AcceptanceProduct entity);

    AcceptanceProduct toEntity(AcceptanceProductRequest request);

    void updateEntity(@MappingTarget AcceptanceProduct entity, AcceptanceProductRequest request);
}
