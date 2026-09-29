package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.PositionPermissionItem;
import com.ecotel.thong_ke_cao_son.dto.request.UserAccountCreateRequest;
import com.ecotel.thong_ke_cao_son.dto.request.UserAccountUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.response.UserResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.UserMapper;
import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.model.UserPermission;
import com.ecotel.thong_ke_cao_son.repository.PositionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserPermissionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAll(String keyword, Long departmentId, Pageable pageable) {
        Page<UserResponse> page = userRepository.search(keyword, departmentId, pageable)
                .map(this::toResponseWithPermissions);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return toResponseWithPermissions(find(id));
    }

    /**
     * Tạo tài khoản — Danh mục Hệ thống, chủ dự án chốt 2026-09-10: chỉ chọn
     * Chức vụ, KHÔNG chọn Role nữa (bỏ hẳn, xem {@code LocalAuthService});
     * Phòng ban tự suy từ {@code position.department}, không cho chọn tay để
     * tránh lệch với Chức vụ đã chọn.
     *
     * <p>Lượt 2 (2026-09-10): thêm {@code permissions} — quyền RIÊNG của tài
     * khoản, form đọc sẵn quyền của Chức vụ đã chọn để gợi ý nhưng người tạo
     * có thể sửa trước khi lưu. Để trống = thừa kế theo Chức vụ (xem
     * {@code LocalAuthService.permissionsFor}), không phải "không có quyền".
     */
    @Transactional
    public UserResponse create(UserAccountCreateRequest request) {
        ensureUsernameAvailable(request.getUsername(), null);
        ensureSalaryCodeAvailable(request.getSalaryCode(), null);
        Position position = findPosition(request.getPositionId());
        validatePermissionsAgainstDepartment(request.getPermissions(), position.getDepartment());

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setSalaryCode(request.getSalaryCode());
        user.setPosition(position);
        user.setDepartment(position.getDepartment());
        user.setActive(true);
        user = userRepository.save(user);
        savePermissions(user, request.getPermissions());
        return toResponseWithPermissions(user);
    }

    @Transactional
    public UserResponse update(Long id, UserAccountUpdateRequest request) {
        User user = find(id);
        ensureSalaryCodeAvailable(request.getSalaryCode(), id);
        Position position = findPosition(request.getPositionId());
        validatePermissionsAgainstDepartment(request.getPermissions(), position.getDepartment());

        user.setSalaryCode(request.getSalaryCode());
        user.setFullName(request.getFullName());
        user.setPosition(position);
        user.setDepartment(position.getDepartment());
        user.setActive(request.getActive());
        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        user = userRepository.save(user);
        savePermissions(user, request.getPermissions());
        return toResponseWithPermissions(user);
    }

    private User find(Long id) {
        return userRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy tài khoản với id: " + id));
    }

    private Position findPosition(Long positionId) {
        return positionRepository.findById(positionId).orElseThrow(
                () -> new BadRequestException("Không tìm thấy chức vụ với id: " + positionId));
    }

    private void ensureUsernameAvailable(String username, Long selfId) {
        boolean taken = selfId == null
                ? userRepository.findByUsername(username).isPresent()
                : userRepository.existsByUsernameAndIdNot(username, selfId);
        if (taken) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại: " + username);
        }
    }

    private void ensureSalaryCodeAvailable(String salaryCode, Long selfId) {
        boolean taken = selfId == null
                ? userRepository.findBySalaryCode(salaryCode).isPresent()
                : userRepository.existsBySalaryCodeAndIdNot(salaryCode, selfId);
        if (taken) {
            throw new BadRequestException("Số thẻ lương đã tồn tại: " + salaryCode);
        }
    }

    /** Cùng quy tắc trần quyền với Chức vụ — không set được quyền ngoài tập Phòng ban cho phép. */
    private void validatePermissionsAgainstDepartment(List<PositionPermissionItem> permissions, Department department) {
        if (permissions == null || permissions.isEmpty() || department == null) return;
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

    /** Thay thế toàn bộ quyền riêng hiện có — xoá hết rồi ghi lại đúng danh sách gửi lên. */
    private void savePermissions(User user, List<PositionPermissionItem> items) {
        userPermissionRepository.deleteByUser_Id(user.getId());
        if (items == null || items.isEmpty()) return;
        List<UserPermission> entities = items.stream().map(item -> {
            UserPermission permission = userMapper.toPermissionEntity(item);
            permission.setUser(user);
            return permission;
        }).toList();
        userPermissionRepository.saveAll(entities);
    }

    private UserResponse toResponseWithPermissions(User user) {
        UserResponse response = userMapper.toResponse(user);
        List<UserPermission> permissions = userPermissionRepository.findByUser_Id(user.getId());
        return response.toBuilder().permissions(userMapper.toPermissionResponseList(permissions)).build();
    }
}
