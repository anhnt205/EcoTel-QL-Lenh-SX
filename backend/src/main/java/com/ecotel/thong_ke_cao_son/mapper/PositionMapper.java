package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.PositionPermissionItem;
import com.ecotel.thong_ke_cao_son.dto.request.PositionRequest;
import com.ecotel.thong_ke_cao_son.dto.response.PositionPermissionResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PositionResponse;
import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

/**
 * Chỉ map các field "phẳng" của {@link Position} — {@code department} và
 * {@code permissions} (quyền C/R/U/D/A) được {@code PositionService} tự lo,
 * vì cả hai đều cần tra thêm repository khác (department theo id gửi lên,
 * permissions là 1 bảng riêng {@code position_permissions} chứ không phải
 * quan hệ JPA 2 chiều trên {@code Position}).
 */
@Mapper(componentModel = "spring")
public interface PositionMapper {

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "permissions", ignore = true)
    PositionResponse toResponse(Position position);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "department", ignore = true)
    Position toEntity(PositionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "department", ignore = true)
    void updateEntity(@MappingTarget Position entity, PositionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "position", ignore = true)
    @Mapping(target = "canCreate", source = "c")
    @Mapping(target = "canRead", source = "r")
    @Mapping(target = "canUpdate", source = "u")
    @Mapping(target = "canDelete", source = "d")
    @Mapping(target = "canApprove", source = "a")
    PositionPermission toPermissionEntity(PositionPermissionItem item);

    @Mapping(target = "c", source = "canCreate")
    @Mapping(target = "r", source = "canRead")
    @Mapping(target = "u", source = "canUpdate")
    @Mapping(target = "d", source = "canDelete")
    @Mapping(target = "a", source = "canApprove")
    PositionPermissionResponse toPermissionResponse(PositionPermission permission);

    List<PositionPermissionResponse> toPermissionResponseList(List<PositionPermission> permissions);
}
