package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.SuffixRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.SuffixResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.SuffixMapper;
import com.ecotel.thong_ke_cao_son.model.Suffix;
import com.ecotel.thong_ke_cao_son.repository.SuffixRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SuffixService {

    private final SuffixRepository repository;
    private final SuffixMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<SuffixResponse> getAll(String keyword, Pageable pageable) {
        Page<SuffixResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public SuffixResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public SuffixResponse create(SuffixRequest request) {
        ensureAvailable(request.getSuffix(), null);
        return mapper.toResponse(repository.save(mapper.toEntity(request)));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<SuffixResponse> bulkCreate(List<SuffixRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> values = requests.stream().map(SuffixRequest::getSuffix).toList();
        if (values.stream().distinct().count() != values.size()) {
            throw new BadRequestException("Có hậu tố bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureAvailable(r.getSuffix(), null));
        return repository.saveAll(requests.stream().map(mapper::toEntity).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public SuffixResponse update(Long id, SuffixRequest request) {
        Suffix entity = find(id);
        ensureAvailable(request.getSuffix(), id);
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<Suffix> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private Suffix find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy hậu tố với id: " + id));
    }

    private void ensureAvailable(String suffix, Long selfId) {
        boolean taken = selfId == null
                ? repository.findBySuffix(suffix).isPresent()
                : repository.existsBySuffixAndIdNot(suffix, selfId);
        if (taken) {
            throw new BadRequestException("Hậu tố đã tồn tại: " + suffix);
        }
    }
}
