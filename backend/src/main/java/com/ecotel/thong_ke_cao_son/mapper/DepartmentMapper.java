package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.DepartmentRequest;
import com.ecotel.thong_ke_cao_son.dto.response.DepartmentResponse;
import com.ecotel.thong_ke_cao_son.model.Department;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {

    DepartmentResponse toResponse(Department department);

    @Mapping(target = "id", ignore = true)
    Department toEntity(DepartmentRequest request);

    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget Department entity, DepartmentRequest request);
}
