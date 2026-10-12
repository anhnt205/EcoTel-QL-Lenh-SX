package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.ReceivingPointRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ReceivingPointResponse;
import com.ecotel.thong_ke_cao_son.model.ReceivingPoint;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ReceivingPointMapper {

    // Bảng hiển thị TÊN nhóm vỉa; chỉ biểu mẫu mới cần id.
    @Mapping(target = "seamGroupId", source = "seamGroup.id")
    @Mapping(target = "seamGroupName", source = "seamGroup.name")
    ReceivingPointResponse toResponse(ReceivingPoint entity);

    /** Nhóm vỉa do service tự resolve từ seamGroupId. */
    @Mapping(target = "seamGroup", ignore = true)
    @Mapping(target = "id", ignore = true)
    ReceivingPoint toEntity(ReceivingPointRequest request);

    @Mapping(target = "seamGroup", ignore = true)
    @Mapping(target = "id", ignore = true)
    void updateEntity(@MappingTarget ReceivingPoint entity, ReceivingPointRequest request);
}
