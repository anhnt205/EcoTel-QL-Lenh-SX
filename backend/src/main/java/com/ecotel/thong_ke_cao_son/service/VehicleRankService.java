package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.VehicleRankRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.VehicleRankResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.VehicleRankMapper;
import com.ecotel.thong_ke_cao_son.model.VehicleRank;
import com.ecotel.thong_ke_cao_son.model.VehicleRankGroup;
import com.ecotel.thong_ke_cao_son.repository.VehicleRankGroupRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleRankRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Danh mục Hạng xe. */
@Service
@RequiredArgsConstructor
public class VehicleRankService {

    private final VehicleRankRepository repository;
    private final VehicleRankGroupRepository groupRepository;
    private final VehicleRankMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<VehicleRankResponse> getAll(String keyword, Pageable pageable) {
        Page<VehicleRankResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public VehicleRankResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public VehicleRankResponse create(VehicleRankRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        VehicleRank entity = mapper.toEntity(request);
        applyGroup(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<VehicleRankResponse> bulkCreate(List<VehicleRankRequest> requests) {
        // Chặn trùng mã NGAY TRONG danh sách gửi lên: ràng buộc UNIQUE của DB
        // không bắt được xung đột giữa các dòng của cùng một lần insert.
        List<String> codes = requests.stream().map(VehicleRankRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã hạng xe bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        return repository.saveAll(requests.stream().map(r -> {
                    VehicleRank e = mapper.toEntity(r);
                    applyGroup(e, r);
                    return e;
                }).toList())
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public VehicleRankResponse update(Long id, VehicleRankRequest request) {
        VehicleRank entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        mapper.updateEntity(entity, request);
        applyGroup(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<VehicleRank> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /** Gắn Nhóm hạng xe từ id — MapStruct cố tình bỏ qua quan hệ này. */
    private void applyGroup(VehicleRank entity, VehicleRankRequest request) {
        VehicleRankGroup group = groupRepository.findById(request.getVehicleRankGroupId()).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy nhóm hạng xe với id: "
                        + request.getVehicleRankGroupId()));
        entity.setVehicleRankGroup(group);
    }

    private VehicleRank find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy hạng xe với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? repository.findByCode(code).isPresent()
                : repository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã hạng xe đã tồn tại: " + code);
        }
    }
}
