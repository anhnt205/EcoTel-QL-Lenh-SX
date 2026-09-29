package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.SeamGroupRequest;
import com.ecotel.thong_ke_cao_son.dto.response.SeamGroupResponse;
import com.ecotel.thong_ke_cao_son.model.SeamGroup;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SeamGroupMapper {

    SeamGroupResponse toResponse(SeamGroup entity);

    SeamGroup toEntity(SeamGroupRequest request);

    void updateEntity(@MappingTarget SeamGroup entity, SeamGroupRequest request);
}
