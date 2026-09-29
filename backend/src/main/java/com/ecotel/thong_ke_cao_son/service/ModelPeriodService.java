package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ModelPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ModelPeriodResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.model.ModelPeriod;
import com.ecotel.thong_ke_cao_son.model.ModelPeriodValue;
import com.ecotel.thong_ke_cao_son.repository.CargoTypeRepository;
import com.ecotel.thong_ke_cao_son.repository.ModelPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Danh mục Mô hình (m3/chuyến) — mirror {@link DensityParameterService},
 * khác ở chỗ mỗi dòng có NHIỀU giá trị theo Chủng loại xe (xem
 * {@link ModelPeriodValue}) thay vì 2 trường cố định.
 */
@Service
@RequiredArgsConstructor
public class ModelPeriodService {

    private final ModelPeriodRepository repository;
    private final CargoTypeRepository cargoTypeRepository;

    @Transactional(readOnly = true)
    public PageResponse<ModelPeriodResponse> getAll(String keyword, Pageable pageable) {
        return PageResponse.from(repository.search(keyword, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public ModelPeriodResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public ModelPeriodResponse create(ModelPeriodRequest request) {
        return toResponse(repository.save(build(new ModelPeriod(), request, null)));
    }

    @Transactional
    public List<ModelPeriodResponse> bulkCreate(List<ModelPeriodRequest> requests) {
        // Các dòng trong cùng một lần lưu phải kiểm tra chồng lấn LẪN NHAU:
        // truy vấn DB không nhìn thấy những dòng chưa được insert.
        for (int i = 0; i < requests.size(); i++) {
            for (int j = i + 1; j < requests.size(); j++) {
                ModelPeriodRequest a = requests.get(i);
                ModelPeriodRequest b = requests.get(j);
                if (sameKey(a, b) && overlaps(a, b)) {
                    throw new BadRequestException("Dòng " + (i + 1) + " và dòng " + (j + 1)
                            + " cùng chủng loại hàng nhưng chồng khoảng hiệu lực.");
                }
            }
        }
        return requests.stream()
                .map(r -> toResponse(repository.save(build(new ModelPeriod(), r, null))))
                .toList();
    }

    @Transactional
    public ModelPeriodResponse update(Long id, ModelPeriodRequest request) {
        return toResponse(repository.save(build(find(id), request, id)));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<ModelPeriod> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /**
     * Thay THẲNG các dòng đã lưu: xoá bản ghi cũ rồi tạo bản ghi mới, trong
     * CÙNG một giao dịch — dùng cho màn "Sửa mô hình". Xoá trước rồi
     * {@code flush()} ngay để câu kiểm tra chồng lấn (một SELECT riêng)
     * không còn thấy bản ghi cũ — xem lý do đầy đủ ở
     * {@code DensityParameterService#replaceBatch}.
     */
    @Transactional
    public List<ModelPeriodResponse> replaceBatch(List<Long> deleteIds, List<ModelPeriodRequest> creates) {
        if (!deleteIds.isEmpty()) {
            List<ModelPeriod> found = repository.findAllById(deleteIds);
            repository.deleteAll(found);
            repository.flush();
        }
        return bulkCreate(creates);
    }

    @Transactional(readOnly = true)
    public ModelPeriod resolve(Long cargoTypeId, LocalDate date) {
        return findEffective(cargoTypeId, date)
                .orElseThrow(() -> new BadRequestException(
                        "Chưa khai báo Mô hình có hiệu lực ngày " + date
                                + " cho chủng loại hàng id=" + cargoTypeId));
    }

    @Transactional(readOnly = true)
    public Optional<ModelPeriod> findEffective(Long cargoTypeId, LocalDate date) {
        return repository.findEffective(cargoTypeId, date).stream().findFirst();
    }

    @Transactional(readOnly = true)
    public ModelPeriodResponse lookup(Long cargoTypeId, LocalDate date) {
        return toResponse(resolve(cargoTypeId, date));
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private ModelPeriod build(ModelPeriod entity, ModelPeriodRequest r, Long selfId) {
        if (r.getEffectiveFrom().isAfter(r.getEffectiveTo())) {
            throw new BadRequestException("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày");
        }

        CargoType cargoType = cargoTypeRepository.findById(r.getCargoTypeId()).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Không tìm thấy chủng loại hàng id: " + r.getCargoTypeId()));

        List<ModelPeriod> clashes = repository.findOverlapping(
                r.getCargoTypeId(), r.getEffectiveFrom(), r.getEffectiveTo(), selfId);
        if (!clashes.isEmpty()) {
            ModelPeriod c = clashes.get(0);
            throw new BadRequestException("Đã có Mô hình cho \"" + cargoType.getName()
                    + "\" chồng khoảng ngày: " + c.getEffectiveFrom() + " - " + c.getEffectiveTo());
        }

        entity.setCargoType(cargoType);
        entity.setEffectiveFrom(r.getEffectiveFrom());
        entity.setEffectiveTo(r.getEffectiveTo());
        entity.setNote(r.getNote());

        // Mutate ĐÚNG list instance đang có (không gán list mới) — có
        // orphanRemoval=true nên Hibernate chỉ tự xoá được các giá trị cũ
        // không còn trong yêu cầu mới khi collection được sửa tại chỗ.
        entity.getValues().clear();
        r.getValues().forEach((vehicleKey, value) -> {
            ModelPeriodValue v = new ModelPeriodValue();
            v.setModelPeriod(entity);
            v.setVehicleKey(vehicleKey);
            v.setValue(value);
            entity.getValues().add(v);
        });

        return entity;
    }

    private static boolean sameKey(ModelPeriodRequest a, ModelPeriodRequest b) {
        return a.getCargoTypeId().equals(b.getCargoTypeId());
    }

    private static boolean overlaps(ModelPeriodRequest a, ModelPeriodRequest b) {
        return !a.getEffectiveFrom().isAfter(b.getEffectiveTo())
                && !a.getEffectiveTo().isBefore(b.getEffectiveFrom());
    }

    private ModelPeriodResponse toResponse(ModelPeriod m) {
        CargoType ct = m.getCargoType();
        Map<String, java.math.BigDecimal> values = new LinkedHashMap<>();
        m.getValues().forEach(v -> values.put(v.getVehicleKey(), v.getValue()));
        return ModelPeriodResponse.builder()
                .id(m.getId())
                .cargoTypeId(ct.getId())
                .cargoTypeCode(ct.getCode())
                .cargoTypeName(ct.getName())
                .effectiveFrom(m.getEffectiveFrom())
                .effectiveTo(m.getEffectiveTo())
                .note(m.getNote())
                .values(values)
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }

    private ModelPeriod find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy mô hình với id: " + id));
    }
}
