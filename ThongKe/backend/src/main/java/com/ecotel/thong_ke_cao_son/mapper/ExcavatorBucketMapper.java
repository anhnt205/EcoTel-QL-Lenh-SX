package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavatorBucketRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavatorBucketResponse;
import com.ecotel.thong_ke_cao_son.model.ExcavatorBucket;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExcavatorBucketMapper {

    ExcavatorBucketResponse toResponse(ExcavatorBucket entity);

    @Mapping(target = "id", ignore = true)
    ExcavatorBucket toEntity(ExcavatorBucketRequest request);

    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget ExcavatorBucket entity, ExcavatorBucketRequest request);
}
