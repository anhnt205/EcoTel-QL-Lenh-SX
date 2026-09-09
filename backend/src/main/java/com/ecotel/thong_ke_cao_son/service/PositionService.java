package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.PositionPermissionItem;
import com.ecotel.thong_ke_cao_son.dto.request.PositionRequest;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PositionResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.PositionMapper;
import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import com.ecotel.thong_ke_cao_son.repository.DepartmentRepository;
import com.ecotel.thong_ke_cao_son.repository.PositionPermissionRepository;
import com.ecotel.thong_ke_cao_son.repository.PositionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionService {

    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionPermissionRepository positionPermissionRepository;
    private final UserRepository userRepository;
    private final PositionMapper positionMapper;

    @Transactional(readOnly = true)
    public PageResponse<PositionResponse> getAll(String keyword, Long departmentId, Pageable pageable) {
        Page<PositionResponse> page = positionRepository.search(keyword, departmentId, pageable)
                .map(this::toResponseWithPermissions);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public PositionResponse getById(Long id) {
        return toResponseWithPermissions(find(id));
    }

    @Transactional
    public PositionResponse create(PositionRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        Department department = findDepartment(request.getDepartmentId());
        validatePermissionsAgainstDepartment(request.getPermissions(), department);

        Position entity = positionMapper.toEntity(request);
        entity.setDepartment(department);
        entity = positionRepository.save(entity);
        savePermissions(entity, request.getPermissions());
        return toResponseWithPermissions(entity);
    }

    @Transactional
    public PositionResponse update(Long id, PositionRequest request) {
        Position entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        Department department = findDepartment(request.getDepartmentId());
        validatePermissionsAgainstDepartment(request.getPermissions(), department);

        positionMapper.updateEntity(entity, request);
        entity.setDepartment(department);
        entity = positionRepository.save(entity);
        savePermissions(entity, request.getPermissions());
        return toResponseWithPermissions(entity);
    }

    @Transactional
    public void delete(Long id) {
        Position entity = find(id);
        if (userRepository.existsByPosition_Id(id)) {
            throw new BadRequestException(
                    "Không thể xoá chức vụ \"" + entity.getName() + "\" vì đang có tài khoản gán chức vụ này");
        }
        positionPermissionRepository.deleteByPosition_Id(id);
        positionRepository.delete(entity);
    }

    private Position find(Long id) {
        return positionRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy chức vụ với id: " + id));
    }

    private Department findDepartment(Long departmentId) {
        return departmentRepository.findById(departmentId).orElseThrow(
                () -> new BadRequestException("Không tìm thấy phòng ban với id: " + departmentId));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? positionRepository.findByCode(code).isPresent()
                : positionRepository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã chức vụ đã tồn tại: " + code);
        }
    }

    /**
     * Mỗi resource Chức vụ định set quyền PHẢI nằm trong tập "chức năng"
     * phòng ban chủ quản đã tick — chủ dự án chốt 2026-09-10 (Phòng ban là
     * TRẦN quyền, Chức vụ chỉ được set trong trần đó, không được vượt ra).
     */
    private void validatePermissionsAgainstDepartment(List<PositionPermissionItem> permissions, Department department) {
        if (permissions == null || permissions.isEmpty()) return;
        List<String> outsideAllowed = permissions.stream()
                .map(PositionPermissionItem::getResource)
                .filter(resource -> !department.getAllowedResources().contains(resource))
                .toList();
        if (!outsideAllowed.isEmpty()) {
            throw new BadRequestException(
                    "Phòng ban \"" + department.getName() + "\" chưa được phép dùng các chức năng: "
                            + String.join(", ", outsideAllowed));
        }
    }

    /** Thay thế toàn bộ quyền hiện có — xoá hết rồi ghi lại đúng danh sách gửi lên. */
    private void savePermissions(Position position, List<PositionPermissionItem> items) {
        positionPermissionRepository.deleteByPosition_Id(position.getId());
        if (items == null || items.isEmpty()) return;
        List<PositionPermission> entities = items.stream().map(item -> {
            PositionPermission permission = positionMapper.toPermissionEntity(item);
            permission.setPosition(position);
            return permission;
        }).toList();
        positionPermissionRepository.saveAll(entities);
    }

    private PositionResponse toResponseWithPermissions(Position position) {
        PositionResponse response = positionMapper.toResponse(position);
        List<PositionPermission> permissions = positionPermissionRepository.findByPosition_Id(position.getId());
        return response.toBuilder().permissions(positionMapper.toPermissionResponseList(permissions)).build();
    }
}
