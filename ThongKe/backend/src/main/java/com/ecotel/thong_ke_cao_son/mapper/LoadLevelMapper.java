package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.response.LoadLevelResponse;
import com.ecotel.thong_ke_cao_son.model.LoadLevel;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LoadLevelMapper {
    LoadLevelResponse toResponse(LoadLevel loadLevel);
}
