package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.SuffixRequest;
import com.ecotel.thong_ke_cao_son.dto.response.SuffixResponse;
import com.ecotel.thong_ke_cao_son.model.Suffix;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SuffixMapper {

    SuffixResponse toResponse(Suffix entity);

    Suffix toEntity(SuffixRequest request);

    void updateEntity(@MappingTarget Suffix entity, SuffixRequest request);
}
