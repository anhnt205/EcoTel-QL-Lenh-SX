package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ShiftRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ShiftResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ShiftMapper;
import com.ecotel.thong_ke_cao_son.model.Shift;
import com.ecotel.thong_ke_cao_son.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Danh mục Ca làm việc (đọc + thêm/sửa/xóa). */
@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final ShiftMapper shiftMapper;

    @Transactional(readOnly = true)
    public PageResponse<ShiftResponse> getAll(String keyword, Pageable pageable) {
        Page<ShiftResponse> page = shiftRepository.search(keyword, pageable)
                .map(shiftMapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ShiftResponse getById(Long id) {
        return shiftMapper.toResponse(find(id));
    }

    @Transactional
    public ShiftResponse create(ShiftRequest request) {
        ensureNameAvailable(request.getName(), null);
        return shiftMapper.toResponse(shiftRepository.save(apply(new Shift(), request)));
    }

    /** Tạo nhiều ca trong một lần (màn Thêm mới nhập nhiều dòng). */
    @Transactional
    public List<ShiftResponse> bulkCreate(List<ShiftRequest> requests) {
        List<Integer> names = requests.stream().map(ShiftRequest::getName).toList();
        if (names.stream().distinct().count() != names.size()) {
            throw new BadRequestException("Có ca làm việc bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureNameAvailable(r.getName(), null));
        return shiftRepository.saveAll(requests.stream().map(r -> apply(new Shift(), r)).toList())
                .stream().map(shiftMapper::toResponse).toList();
    }

    @Transactional
    public ShiftResponse update(Long id, ShiftRequest request) {
        Shift shift = find(id);
        ensureNameAvailable(request.getName(), id);
        return shiftMapper.toResponse(shiftRepository.save(apply(shift, request)));
    }

    @Transactional
    public void delete(Long id) {
        shiftRepository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<Shift> found = shiftRepository.findAllById(ids);
        shiftRepository.deleteAll(found);
        return BulkDeleteResponse.builder().requestedCount(ids.size()).deletedCount(found.size()).build();
    }

    private Shift apply(Shift shift, ShiftRequest r) {
        shift.setName(r.getName());
        shift.setCode(r.getCode());
        shift.setDescription(r.getDescription());
        shift.setStartTime(r.getStartTime());
        shift.setEndTime(r.getEndTime());
        return shift;
    }

    private Shift find(Long id) {
        return shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca làm việc với id: " + id));
    }

    private void ensureNameAvailable(Integer name, Long selfId) {
        shiftRepository.findByName(name).ifPresent(other -> {
            if (selfId == null || !other.getId().equals(selfId)) {
                throw new BadRequestException("Ca làm việc đã tồn tại: Ca " + name);
            }
        });
    }
}
