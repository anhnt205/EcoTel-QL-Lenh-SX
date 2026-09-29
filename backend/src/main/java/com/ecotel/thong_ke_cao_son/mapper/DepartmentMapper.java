package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.DepartmentRequest;
import com.ecotel.thong_ke_cao_son.dto.response.DepartmentResponse;
import com.ecotel.thong_ke_cao_son.model.Department;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {

    DepartmentResponse toResponse(Department department);

    /** Phòng ban mới LUÔN bắt đầu false (đúng default entity) — bật "thấy toàn bộ" là hành động sửa riêng, sau khi tạo. */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "fullDataScope", ignore = true)
    Department toEntity(DepartmentRequest request);

    /**
     * {@code fullDataScope} chưa có ô trên form Phòng ban (chỉ đặt được qua
     * API riêng) — NullValuePropertyMappingStrategy.IGNORE để request cũ
     * (không gửi field này) không vô tình XOÁ giá trị true đã đặt trước đó.
     */
    @Mapping(target = "id", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(@MappingTarget Department entity, DepartmentRequest request);
}
