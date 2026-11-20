package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavatorBucketRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavatorBucketResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ExcavatorBucketMapper;
import com.ecotel.thong_ke_cao_son.model.ExcavatorBucket;
import com.ecotel.thong_ke_cao_son.repository.DeviceRepository;
import com.ecotel.thong_ke_cao_son.repository.ExcavatorBucketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Danh mục Gầu xúc. */
@Service
@RequiredArgsConstructor
public class ExcavatorBucketService {

    private final ExcavatorBucketRepository repository;
    private final ExcavatorBucketMapper mapper;
    private final DeviceRepository deviceRepository;

    @Transactional(readOnly = true)
    public PageResponse<ExcavatorBucketResponse> getAll(String keyword, Pageable pageable) {
        Page<ExcavatorBucketResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ExcavatorBucketResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public ExcavatorBucketResponse create(ExcavatorBucketRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        return mapper.toResponse(repository.save(mapper.toEntity(request)));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<ExcavatorBucketResponse> bulkCreate(List<ExcavatorBucketRequest> requests) {
        List<String> codes = requests.stream().map(ExcavatorBucketRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã gầu xúc bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        return repository.saveAll(requests.stream().map(mapper::toEntity).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public ExcavatorBucketResponse update(Long id, ExcavatorBucketRequest request) {
        ExcavatorBucket entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        ensureNotInUse(List.of(id));
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        ensureNotInUse(ids);
        List<ExcavatorBucket> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /** Gầu xúc đang gắn cho máy thì không xoá được — báo rõ thay vì lỗi khoá ngoại khó hiểu. */
    private void ensureNotInUse(List<Long> ids) {
        if (deviceRepository.existsByBucketIdIn(ids)) {
            throw new BadRequestException("Gầu xúc đang được gán cho máy xúc — hãy bỏ gán ở màn Thông tin máy trước khi xoá");
        }
    }

    private ExcavatorBucket find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy gầu xúc với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByCode(code).isPresent()
                : repository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã gầu xúc đã tồn tại: " + code);
        }
    }
}
