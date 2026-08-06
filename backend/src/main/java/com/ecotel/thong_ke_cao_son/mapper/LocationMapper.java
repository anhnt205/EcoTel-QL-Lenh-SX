package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.response.LocationResponse;
import com.ecotel.thong_ke_cao_son.model.Location;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface LocationMapper {

    @Mapping(target = "longitude", source = "coordinates.longitude")
    @Mapping(target = "latitude", source = "coordinates.latitude")
    LocationResponse toResponse(Location location);
}
