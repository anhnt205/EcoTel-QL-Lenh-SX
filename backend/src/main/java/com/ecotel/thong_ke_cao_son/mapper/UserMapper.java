package com.ecotel.thong_ke_cao_son.mapper;

import com.ecotel.thong_ke_cao_son.dto.request.PositionPermissionItem;
import com.ecotel.thong_ke_cao_son.dto.response.PositionPermissionResponse;
import com.ecotel.thong_ke_cao_son.dto.response.UserResponse;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.model.UserPermission;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "positionId", source = "position.id")
    @Mapping(target = "positionName", source = "position.name")
    @Mapping(target = "permissions", ignore = true)
    UserResponse toResponse(User user);

    // Cùng hình dạng với PositionPermission/PositionPermissionItem nhưng khác
    // entity — không tái dùng được PositionMapper (nó gắn chặt với Position).
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "canCreate", source = "c")
    @Mapping(target = "canRead", source = "r")
    @Mapping(target = "canUpdate", source = "u")
    @Mapping(target = "canDelete", source = "d")
    @Mapping(target = "canApprove", source = "a")
    UserPermission toPermissionEntity(PositionPermissionItem item);

    @Mapping(target = "c", source = "canCreate")
    @Mapping(target = "r", source = "canRead")
    @Mapping(target = "u", source = "canUpdate")
    @Mapping(target = "d", source = "canDelete")
    @Mapping(target = "a", source = "canApprove")
    PositionPermissionResponse toPermissionResponse(UserPermission permission);

    List<PositionPermissionResponse> toPermissionResponseList(List<UserPermission> permissions);
}
