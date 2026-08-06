package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.response.ShiftResponse;
import com.ecotel.thong_ke_cao_son.model.Shift;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ShiftMapper {
    ShiftResponse toResponse(Shift shift);
}
