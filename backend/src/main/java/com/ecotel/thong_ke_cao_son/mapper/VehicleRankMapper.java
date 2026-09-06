package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleRankRequest;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleRankResponse;
import com.ecotel.thong_ke_cao_son.model.VehicleRank;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface VehicleRankMapper {

    // Bảng hiển thị TÊN nhóm hạng xe; chỉ biểu mẫu mới cần id.
    @Mapping(target = "vehicleRankGroupId", source = "vehicleRankGroup.id")
    @Mapping(target = "vehicleRankGroupName", source = "vehicleRankGroup.name")
    // Danh mục này không có trường tên riêng — xem javadoc `name` ở response.
    @Mapping(target = "name", source = "code")
    VehicleRankResponse toResponse(VehicleRank entity);

    /** Nhóm hạng xe do service tự resolve từ vehicleRankGroupId. */
    @Mapping(target = "vehicleRankGroup", ignore = true)
    @Mapping(target = "id", ignore = true)
    VehicleRank toEntity(VehicleRankRequest request);

    @Mapping(target = "vehicleRankGroup", ignore = true)
    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget VehicleRank entity, VehicleRankRequest request);
}
