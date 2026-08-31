package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.TtlClhRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TtlClhResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.TtlClhMapper;
import com.ecotel.thong_ke_cao_son.model.TtlClh;
import com.ecotel.thong_ke_cao_son.repository.TtlClhRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TtlClhService {

    private final TtlClhRepository repository;
    private final TtlClhMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<TtlClhResponse> getAll(String keyword, Pageable pageable) {
        Page<TtlClhResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public TtlClhResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public TtlClhResponse create(TtlClhRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        return mapper.toResponse(repository.save(mapper.toEntity(request)));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<TtlClhResponse> bulkCreate(List<TtlClhRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> codes = requests.stream().map(TtlClhRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã TTL CLH bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        return repository.saveAll(requests.stream().map(mapper::toEntity).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public TtlClhResponse update(Long id, TtlClhRequest request) {
        TtlClh entity = find(id);
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
        List<TtlClh> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private TtlClh find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy TTL CLH với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByCode(code).isPresent()
                : repository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã TTL CLH đã tồn tại: " + code);
        }
    }
}
