package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.response.DeviceResponse;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.DeviceFile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface DeviceMapper {

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "categoryGroup", source = "category.group")
    @Mapping(target = "materialId", source = "material.id")
    @Mapping(target = "materialName", source = "material.name")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "updatedById", source = "updatedBy.id")
    @Mapping(target = "updatedByName", source = "updatedBy.fullName")
    @Mapping(target = "longitude", source = "coordinates.longitude")
    @Mapping(target = "latitude", source = "coordinates.latitude")
    @Mapping(target = "files", expression = "java(mapFiles(device.getFiles()))")
    DeviceResponse toResponse(Device device);

    default List<String> mapFiles(List<DeviceFile> files) {
        if (files == null) {
            return null;
        }
        return files.stream()
                .map(file -> file.getFileName() != null ? file.getFileName() : file.getKey())
                .collect(Collectors.toList());
    }
}
