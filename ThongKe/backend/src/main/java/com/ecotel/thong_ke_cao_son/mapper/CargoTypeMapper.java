package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.CargoTypeRequest;
import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CargoTypeMapper {

    @Mapping(target = "cargoGroupId", source = "cargoGroup.id")
    @Mapping(target = "cargoGroupName", source = "cargoGroup.name")
    // Trả kèm TÊN của hai danh mục tham chiếu: bảng và file Excel hiển thị
    // tên, chỉ biểu mẫu mới cần id.
    @Mapping(target = "acceptanceProductId", source = "acceptanceProduct.id")
    @Mapping(target = "acceptanceProductName", source = "acceptanceProduct.name")
    @Mapping(target = "ttlClhId", source = "ttlClh.id")
    @Mapping(target = "ttlClhName", source = "ttlClh.name")
    CargoTypeResponse toResponse(CargoType cargoType);

    /** Ba quan hệ do service tự resolve từ id tương ứng. */
    @Mapping(target = "cargoGroup", ignore = true)
    @Mapping(target = "acceptanceProduct", ignore = true)
    @Mapping(target = "ttlClh", ignore = true)
    @Mapping(target = "id", ignore = true)
    CargoType toEntity(CargoTypeRequest request);

    @Mapping(target = "cargoGroup", ignore = true)
    @Mapping(target = "acceptanceProduct", ignore = true)
    @Mapping(target = "ttlClh", ignore = true)
    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget CargoType entity, CargoTypeRequest request);
}
