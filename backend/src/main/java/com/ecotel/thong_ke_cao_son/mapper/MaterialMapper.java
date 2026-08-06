package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.response.MaterialResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MaterialValueHistoryResponse;
import com.ecotel.thong_ke_cao_son.model.Material;
import com.ecotel.thong_ke_cao_son.model.MaterialValueHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface MaterialMapper {

    MaterialResponse toResponse(Material material);

    @Mapping(target = "density", source = "density")
    @Mapping(target = "dryDensity", source = "dryDensity")
    @Mapping(target = "startTime", source = "startTime")
    @Mapping(target = "endTime", source = "endTime")
    MaterialValueHistoryResponse toValueHistoryResponse(MaterialValueHistory history);

    List<MaterialValueHistoryResponse> toValueHistoryResponseList(List<MaterialValueHistory> histories);
}
