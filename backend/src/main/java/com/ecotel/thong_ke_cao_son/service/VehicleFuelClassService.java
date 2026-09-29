package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleFuelClassRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleFuelClassResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.VehicleFuelClassMapper;
import com.ecotel.thong_ke_cao_son.model.VehicleFuelClass;
import com.ecotel.thong_ke_cao_son.repository.VehicleFuelClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleFuelClassService {

    private final VehicleFuelClassRepository repository;
    private final VehicleFuelClassMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<VehicleFuelClassResponse> getAll(String keyword, Pageable pageable) {
        Page<VehicleFuelClassResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public VehicleFuelClassResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public VehicleFuelClassResponse create(VehicleFuelClassRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        return mapper.toResponse(repository.save(mapper.toEntity(request)));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<VehicleFuelClassResponse> bulkCreate(List<VehicleFuelClassRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> codes = requests.stream().map(VehicleFuelClassRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã chủng loại xe + DMNL bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        return repository.saveAll(requests.stream().map(mapper::toEntity).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public VehicleFuelClassResponse update(Long id, VehicleFuelClassRequest request) {
        VehicleFuelClass entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<VehicleFuelClass> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private VehicleFuelClass find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy chủng loại xe + DMNL với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByCode(code).isPresent()
                : repository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã chủng loại xe + DMNL đã tồn tại: " + code);
        }
    }
}
