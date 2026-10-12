package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ReportPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodResponse;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ReportPeriodMapper {

    @Mapping(target = "dayCount", expression = "java(entity.getDayCount())")
    ReportPeriodResponse toResponse(ReportPeriod entity);

    ReportPeriod toEntity(ReportPeriodRequest request);

    void updateEntity(@MappingTarget ReportPeriod entity, ReportPeriodRequest request);
}
