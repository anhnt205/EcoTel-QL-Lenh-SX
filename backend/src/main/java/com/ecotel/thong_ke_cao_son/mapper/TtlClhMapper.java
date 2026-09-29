package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.TtlClhRequest;
import com.ecotel.thong_ke_cao_son.dto.response.TtlClhResponse;
import com.ecotel.thong_ke_cao_son.model.TtlClh;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TtlClhMapper {

    TtlClhResponse toResponse(TtlClh entity);

    TtlClh toEntity(TtlClhRequest request);

    void updateEntity(@MappingTarget TtlClh entity, TtlClhRequest request);
}
