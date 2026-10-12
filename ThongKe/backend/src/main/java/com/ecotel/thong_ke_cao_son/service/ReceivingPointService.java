package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReceivingPointRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReceivingPointResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ReceivingPointMapper;
import com.ecotel.thong_ke_cao_son.model.ReceivingPoint;
import com.ecotel.thong_ke_cao_son.repository.ReceivingPointRepository;
import com.ecotel.thong_ke_cao_son.repository.SeamGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReceivingPointService {

    private final ReceivingPointRepository repository;
    private final ReceivingPointMapper mapper;
    private final SeamGroupRepository seamGroupRepository;

    @Transactional(readOnly = true)
    public PageResponse<ReceivingPointResponse> getAll(String keyword, Pageable pageable) {
        Page<ReceivingPointResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ReceivingPointResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public ReceivingPointResponse create(ReceivingPointRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        ReceivingPoint entity = mapper.toEntity(request);
        applySeamGroup(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<ReceivingPointResponse> bulkCreate(List<ReceivingPointRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> codes = requests.stream().map(ReceivingPointRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã nơi nhận tải bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        return repository.saveAll(requests.stream().map(r -> {
                    ReceivingPoint e = mapper.toEntity(r);
                    applySeamGroup(e, r);
                    return e;
                }).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public ReceivingPointResponse update(Long id, ReceivingPointRequest request) {
        ReceivingPoint entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        mapper.updateEntity(entity, request);
        applySeamGroup(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<ReceivingPoint> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /**
     * Gắn Nhóm vỉa từ id — MapStruct cố tình bỏ qua quan hệ này.
     *
     * <p>Cho phép để trống: dữ liệu nơi nhận tải có sẵn từ trước, không thể
     * bắt khai đủ ngay. Nhưng gửi id thì id đó phải tồn tại.
     */
    private void applySeamGroup(ReceivingPoint entity, ReceivingPointRequest request) {
        entity.setSeamGroup(request.getSeamGroupId() == null ? null
                : seamGroupRepository.findById(request.getSeamGroupId()).orElseThrow(
                        () -> new ResourceNotFoundException("Không tìm thấy nhóm vỉa với id: "
                                + request.getSeamGroupId())));
    }

    private ReceivingPoint find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy nơi nhận tải với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByCode(code).isPresent()
                : repository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã nơi nhận tải đã tồn tại: " + code);
        }
    }
}
