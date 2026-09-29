package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.DepartmentRequest;
import com.ecotel.thong_ke_cao_son.dto.response.DepartmentResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.DepartmentMapper;
import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.repository.DepartmentRepository;
import com.ecotel.thong_ke_cao_son.repository.PositionRepository;
import com.ecotel.thong_ke_cao_son.security.PermissionResources;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final DepartmentMapper departmentMapper;

    @Transactional(readOnly = true)
    public PageResponse<DepartmentResponse> getAll(String keyword, Pageable pageable) {
        Page<DepartmentResponse> page = departmentRepository.search(keyword, pageable)
                .map(departmentMapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getById(Long id) {
        return departmentMapper.toResponse(find(id));
    }

    /** Toàn bộ resource hợp lệ — dựng checkbox "chức năng" ở màn Phòng ban. */
    @Transactional(readOnly = true)
    public List<String> getAvailableResources() {
        return PermissionResources.ALL;
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        ensureResourcesValid(request.getAllowedResources());
        return departmentMapper.toResponse(departmentRepository.save(departmentMapper.toEntity(request)));
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest request) {
        Department entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        ensureResourcesValid(request.getAllowedResources());
        departmentMapper.updateEntity(entity, request);
        return departmentMapper.toResponse(departmentRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        Department entity = find(id);
        if (positionRepository.existsByDepartment_Id(id)) {
            throw new BadRequestException(
                    "Không thể xoá phòng ban \"" + entity.getName() + "\" vì đang có Chức vụ thuộc phòng ban này");
        }
        departmentRepository.delete(entity);
    }

    private Department find(Long id) {
        return departmentRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy phòng ban với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? departmentRepository.findByCode(code).isPresent()
                : departmentRepository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã phòng ban đã tồn tại: " + code);
        }
    }

    private void ensureResourcesValid(java.util.Set<String> resources) {
        if (resources == null) return;
        List<String> invalid = resources.stream().filter(r -> !PermissionResources.ALL.contains(r)).toList();
        if (!invalid.isEmpty()) {
            throw new BadRequestException("Chức năng không hợp lệ: " + String.join(", ", invalid));
        }
    }
}
