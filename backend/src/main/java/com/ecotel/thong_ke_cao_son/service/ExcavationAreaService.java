package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationAreaRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationAreaResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ExcavationAreaMapper;
import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import com.ecotel.thong_ke_cao_son.repository.ExcavationAreaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExcavationAreaService {

    private final ExcavationAreaRepository repository;
    private final ExcavationAreaMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<ExcavationAreaResponse> getAll(String keyword, Pageable pageable) {
        Page<ExcavationAreaResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ExcavationAreaResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    /** Hai nhóm khu vực hợp lệ — giao diện lấy qua đây, không cắm cứng (QĐ-13). */
    @Transactional(readOnly = true)
    public List<String> getAreaGroups() {
        return ExcavationArea.GROUPS;
    }

    @Transactional
    public ExcavationAreaResponse create(ExcavationAreaRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        ensureAreaGroupValid(request.getAreaGroup());
        return mapper.toResponse(repository.save(mapper.toEntity(request)));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<ExcavationAreaResponse> bulkCreate(List<ExcavationAreaRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> codes = requests.stream().map(ExcavationAreaRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã khu vực xúc bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> {
            ensureCodeAvailable(r.getCode(), null);
            ensureAreaGroupValid(r.getAreaGroup());
        });
        return repository.saveAll(requests.stream().map(mapper::toEntity).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public ExcavationAreaResponse update(Long id, ExcavationAreaRequest request) {
        ExcavationArea entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        ensureAreaGroupValid(request.getAreaGroup());
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<ExcavationArea> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private ExcavationArea find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy khu vực xúc với id: " + id));
    }

    /**
     * Nhóm khu vực chỉ nhận {@code CS} / {@code KC} (QĐ-13). Để TRỐNG vẫn
     * cho lưu — dữ liệu cũ chưa phân nhóm phải nhập dần, không chặn ngay;
     * nhưng khi engine tính mà gặp khu vực chưa phân nhóm thì báo lỗi
     * nghiệp vụ rõ ràng, không đoán bừa một nhóm.
     */
    private void ensureAreaGroupValid(String areaGroup) {
        if (areaGroup == null || areaGroup.isBlank()) return;
        String v = areaGroup.trim();
        if (ExcavationArea.GROUPS.stream().noneMatch(g -> g.equalsIgnoreCase(v))) {
            throw new BadRequestException(
                    "Nhóm khu vực chỉ nhận " + String.join(" hoặc ", ExcavationArea.GROUPS)
                            + " — nhận được: \"" + areaGroup + "\"");
        }
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByCode(code).isPresent()
                : repository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã khu vực xúc đã tồn tại: " + code);
        }
    }
}
