package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ClassificationRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ClassificationResponse;
import com.ecotel.thong_ke_cao_son.model.Classification;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ClassificationMapper {

    ClassificationResponse toResponse(Classification entity);

    Classification toEntity(ClassificationRequest request);

    void updateEntity(@MappingTarget Classification entity, ClassificationRequest request);
}
