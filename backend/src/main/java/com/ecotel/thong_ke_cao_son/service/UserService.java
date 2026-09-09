package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.UserAccountCreateRequest;
import com.ecotel.thong_ke_cao_son.dto.request.UserAccountUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.response.UserResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.UserMapper;
import com.ecotel.thong_ke_cao_son.model.Position;
import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.repository.PositionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAll(String keyword, Long departmentId, Pageable pageable) {
        Page<UserResponse> page = userRepository.search(keyword, departmentId, pageable)
                .map(userMapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        User user = find(id);
        return userMapper.toResponse(user);
    }

    /**
     * Tạo tài khoản — Danh mục Hệ thống, chủ dự án chốt 2026-09-10: chỉ chọn
     * Chức vụ, KHÔNG chọn Role nữa (bỏ hẳn, xem {@code LocalAuthService});
     * Phòng ban tự suy từ {@code position.department}, không cho chọn tay để
     * tránh lệch với Chức vụ đã chọn.
     */
    @Transactional
    public UserResponse create(UserAccountCreateRequest request) {
        ensureUsernameAvailable(request.getUsername(), null);
        ensureSalaryCodeAvailable(request.getSalaryCode(), null);
        Position position = findPosition(request.getPositionId());

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setSalaryCode(request.getSalaryCode());
        user.setPosition(position);
        user.setDepartment(position.getDepartment());
        user.setActive(true);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserAccountUpdateRequest request) {
        User user = find(id);
        ensureSalaryCodeAvailable(request.getSalaryCode(), id);
        Position position = findPosition(request.getPositionId());

        user.setSalaryCode(request.getSalaryCode());
        user.setFullName(request.getFullName());
        user.setPosition(position);
        user.setDepartment(position.getDepartment());
        user.setActive(request.getActive());
        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        return userMapper.toResponse(userRepository.save(user));
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
}
