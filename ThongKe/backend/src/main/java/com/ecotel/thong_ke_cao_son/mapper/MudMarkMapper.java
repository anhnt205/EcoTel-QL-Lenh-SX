package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.MudMarkRequest;
import com.ecotel.thong_ke_cao_son.dto.response.MudMarkResponse;
import com.ecotel.thong_ke_cao_son.model.MudMark;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MudMarkMapper {

    MudMarkResponse toResponse(MudMark entity);

    MudMark toEntity(MudMarkRequest request);

    void updateEntity(@MappingTarget MudMark entity, MudMarkRequest request);
}
