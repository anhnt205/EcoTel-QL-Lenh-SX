package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.DensityParameterRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DensityParameterResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.model.DensityParameter;
import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import com.ecotel.thong_ke_cao_son.repository.CargoTypeRepository;
import com.ecotel.thong_ke_cao_son.repository.DensityParameterRepository;
import com.ecotel.thong_ke_cao_son.repository.ExcavationAreaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/** Danh mục Tỷ trọng — tham số theo thời gian (QĐ-04). */
@Service
@RequiredArgsConstructor
public class DensityParameterService {

    /** Nhãn hiển thị khi bản ghi áp cho mọi khu vực. */
    public static final String ALL_AREAS = "Tất cả khu vực";

    private final DensityParameterRepository repository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ExcavationAreaRepository excavationAreaRepository;

    @Transactional(readOnly = true)
    public PageResponse<DensityParameterResponse> getAll(String keyword, Pageable pageable) {
        return PageResponse.from(repository.search(keyword, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public DensityParameterResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public DensityParameterResponse create(DensityParameterRequest request) {
        return toResponse(repository.save(build(new DensityParameter(), request, null)));
    }

    @Transactional
    public List<DensityParameterResponse> bulkCreate(List<DensityParameterRequest> requests) {
        // Các dòng trong cùng một lô phải kiểm tra chồng lấn LẪN NHAU: truy
        // vấn DB không nhìn thấy những dòng chưa được insert.
        for (int i = 0; i < requests.size(); i++) {
            for (int j = i + 1; j < requests.size(); j++) {
                DensityParameterRequest a = requests.get(i);
                DensityParameterRequest b = requests.get(j);
                if (sameKey(a, b) && overlaps(a, b)) {
                    throw new BadRequestException("Dòng " + (i + 1) + " và dòng " + (j + 1)
                            + " cùng khoá nhưng chồng khoảng hiệu lực.");
                }
            }
        }
        return requests.stream()
                .map(r -> toResponse(repository.save(build(new DensityParameter(), r, null))))
                .toList();
    }

    @Transactional
    public DensityParameterResponse update(Long id, DensityParameterRequest request) {
        return toResponse(repository.save(build(find(id), request, id)));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<DensityParameter> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /**
     * Tra tỷ trọng có hiệu lực tại một ngày.
     *
     * <p>Đây là điểm mà engine tính sản lượng sẽ gọi. Hai quy tắc của QĐ-04
     * nằm gọn ở đây:
     * <ul>
     *   <li>Bản ghi gắn <b>khu vực cụ thể thắng</b> bản ghi "mọi khu vực".</li>
     *   <li>Không tra được thì <b>ném lỗi nghiệp vụ rõ ràng</b>, tuyệt đối
     *       không trả 0 — trả 0 sẽ cho ra sản lượng bằng 0 mà không ai biết
     *       là do thiếu khai báo.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public DensityParameter resolve(Long cargoTypeId, Long excavationAreaId, LocalDate date) {
        List<DensityParameter> candidates =
                repository.findEffective(cargoTypeId, excavationAreaId, date);
        return candidates.stream()
                // Bản có khu vực cụ thể xếp trước bản "mọi khu vực".
                .min(Comparator.comparing(d -> d.getExcavationArea() == null))
                .orElseThrow(() -> new BadRequestException(
                        "Chưa khai báo Tỷ trọng có hiệu lực ngày " + date
                                + " cho chủng loại hàng id=" + cargoTypeId
                                + (excavationAreaId != null ? ", khu vực id=" + excavationAreaId : "")));
    }

    @Transactional(readOnly = true)
    public DensityParameterResponse lookup(Long cargoTypeId, Long excavationAreaId, LocalDate date) {
        return toResponse(resolve(cargoTypeId, excavationAreaId, date));
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private DensityParameter build(DensityParameter entity, DensityParameterRequest r, Long selfId) {
        if (r.getEffectiveFrom().isAfter(r.getEffectiveTo())) {
            throw new BadRequestException("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày");
        }

        CargoType cargoType = cargoTypeRepository.findById(r.getCargoTypeId()).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Không tìm thấy chủng loại hàng id: " + r.getCargoTypeId()));

        ExcavationArea area = null;
        if (r.getExcavationAreaId() != null) {
            area = excavationAreaRepository.findById(r.getExcavationAreaId()).orElseThrow(
                    () -> new ResourceNotFoundException(
                            "Không tìm thấy khu vực xúc id: " + r.getExcavationAreaId()));
        }

        List<DensityParameter> clashes = repository.findOverlapping(
                r.getCargoTypeId(), r.getExcavationAreaId(),
                r.getEffectiveFrom(), r.getEffectiveTo(), selfId);
        if (!clashes.isEmpty()) {
            DensityParameter c = clashes.get(0);
            throw new BadRequestException("Đã có Tỷ trọng cho \"" + cargoType.getName() + "\" / "
                    + (area != null ? area.getName() : ALL_AREAS)
                    + " chồng khoảng ngày: " + c.getEffectiveFrom() + " - " + c.getEffectiveTo());
        }

        entity.setCargoType(cargoType);
        entity.setExcavationArea(area);
        entity.setEffectiveFrom(r.getEffectiveFrom());
        entity.setEffectiveTo(r.getEffectiveTo());
        entity.setDensityWet(r.getDensityWet());
        entity.setDensityDry(r.getDensityDry());
        entity.setNote(r.getNote());
        return entity;
    }

    private static boolean sameKey(DensityParameterRequest a, DensityParameterRequest b) {
        if (!a.getCargoTypeId().equals(b.getCargoTypeId())) return false;
        Long x = a.getExcavationAreaId();
        Long y = b.getExcavationAreaId();
        return x == null ? y == null : x.equals(y);
    }

    private static boolean overlaps(DensityParameterRequest a, DensityParameterRequest b) {
        return !a.getEffectiveFrom().isAfter(b.getEffectiveTo())
                && !a.getEffectiveTo().isBefore(b.getEffectiveFrom());
    }

    private DensityParameterResponse toResponse(DensityParameter d) {
        CargoType ct = d.getCargoType();
        ExcavationArea ea = d.getExcavationArea();
        return DensityParameterResponse.builder()
                .id(d.getId())
                .cargoTypeId(ct.getId())
                .cargoTypeCode(ct.getCode())
                .cargoTypeName(ct.getName())
                .cargoGroupName(ct.getCargoGroup() != null ? ct.getCargoGroup().getName() : null)
                .acceptanceProduct(ct.getAcceptanceProduct())
                .ttlClh(ct.getTtlClh())
                .excavationAreaId(ea != null ? ea.getId() : null)
                .excavationAreaName(ea != null ? ea.getName() : ALL_AREAS)
                .effectiveFrom(d.getEffectiveFrom())
                .effectiveTo(d.getEffectiveTo())
                .densityWet(d.getDensityWet())
                .densityDry(d.getDensityDry())
                .note(d.getNote())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }

    private DensityParameter find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy tỷ trọng với id: " + id));
    }
}
