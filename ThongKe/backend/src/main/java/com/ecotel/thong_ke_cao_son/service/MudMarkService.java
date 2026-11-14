package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.MudMarkRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.MudMarkResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.MudMarkMapper;
import com.ecotel.thong_ke_cao_son.model.MudMark;
import com.ecotel.thong_ke_cao_son.repository.MudMarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MudMarkService {

    private final MudMarkRepository repository;
    private final MudMarkMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<MudMarkResponse> getAll(String keyword, Pageable pageable) {
        Page<MudMarkResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public MudMarkResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public MudMarkResponse create(MudMarkRequest request) {
        ensureAvailable(request.getName(), null);
        return mapper.toResponse(repository.save(mapper.toEntity(request)));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<MudMarkResponse> bulkCreate(List<MudMarkRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> values = requests.stream().map(MudMarkRequest::getName).toList();
        if (values.stream().distinct().count() != values.size()) {
            throw new BadRequestException("Có ký hiệu bùn bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureAvailable(r.getName(), null));
        return repository.saveAll(requests.stream().map(mapper::toEntity).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public MudMarkResponse update(Long id, MudMarkRequest request) {
        MudMark entity = find(id);
        ensureAvailable(request.getName(), id);
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<MudMark> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private MudMark find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy ký hiệu bùn với id: " + id));
    }

    private void ensureAvailable(String name, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByName(name).isPresent()
                : repository.existsByNameAndIdNot(name, selfId);
        if (taken) {
            throw new BadRequestException("Ký hiệu bùn đã tồn tại: " + name);
        }
    }
}
