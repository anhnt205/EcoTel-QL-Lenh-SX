package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationAreaRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationAreaResponse;
import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExcavationAreaMapper {

    ExcavationAreaResponse toResponse(ExcavationArea entity);

    ExcavationArea toEntity(ExcavationAreaRequest request);

    void updateEntity(@MappingTarget ExcavationArea entity, ExcavationAreaRequest request);
}
