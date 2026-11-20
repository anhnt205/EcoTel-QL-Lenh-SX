package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.WasteRockCoefficientRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.WasteRockCoefficientResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import com.ecotel.thong_ke_cao_son.model.WasteRockCoefficient;
import com.ecotel.thong_ke_cao_son.repository.ExcavationAreaRepository;
import com.ecotel.thong_ke_cao_son.repository.WasteRockCoefficientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Danh mục Hệ số đá thải (Thời gian, Khu vực xúc, Hệ số đá thải) — xem {@link WasteRockCoefficient}.
 */
@Service
@RequiredArgsConstructor
public class WasteRockCoefficientService {

    private final WasteRockCoefficientRepository repository;
    private final ExcavationAreaRepository excavationAreaRepository;

    /**
     * Hệ số đá thải của một khu vực xúc trong tháng {@code month}; trống nếu danh mục chưa khai dòng nào chứa
     * khu vực + tháng đó (chỗ gọi để cột Đá thải (m3) trống chứ KHÔNG tự lấy một con số khác).
     */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> coefficientFor(Long excavationAreaId, YearMonth month) {
        if (excavationAreaId == null) {
            return Optional.empty();
        }
        return repository.findFirstCovering(excavationAreaId, month.atDay(1)).map(WasteRockCoefficient::getCoefficient);
    }

    @Transactional(readOnly = true)
    public boolean isAreaInUse(java.util.Collection<Long> areaIds) {
        return repository.existsByExcavationArea_IdIn(areaIds);
    }

    @Transactional(readOnly = true)
    public PageResponse<WasteRockCoefficientResponse> getAll(String keyword, Pageable pageable) {
        String kw = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        // Bảng nhỏ → lọc/sắp xếp trong bộ nhớ, tránh phụ thuộc hàm định dạng ngày của DB.
        List<WasteRockCoefficientResponse> all = repository.findAll().stream()
                .sorted(Comparator.comparing(WasteRockCoefficient::getEffectiveFrom).reversed())
                .map(this::toResponse)
                .filter(r -> kw.isEmpty()
                        || r.getPeriod().toLowerCase(Locale.ROOT).contains(kw)
                        || (r.getExcavationAreaName() != null && r.getExcavationAreaName().toLowerCase(Locale.ROOT).contains(kw))
                        || (r.getNote() != null && r.getNote().toLowerCase(Locale.ROOT).contains(kw)))
                .toList();
        int from = (int) Math.min(pageable.getOffset(), all.size());
        int to = Math.min(from + pageable.getPageSize(), all.size());
        Page<WasteRockCoefficientResponse> page = new PageImpl<>(all.subList(from, to), pageable, all.size());
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public WasteRockCoefficientResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public WasteRockCoefficientResponse create(WasteRockCoefficientRequest request) {
        WasteRockCoefficient entity = new WasteRockCoefficient();
        apply(entity, request, null);
        return toResponse(repository.save(entity));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<WasteRockCoefficientResponse> bulkCreate(List<WasteRockCoefficientRequest> requests) {
        for (int i = 0; i < requests.size(); i++) {
            for (int j = i + 1; j < requests.size(); j++) {
                WasteRockCoefficientRequest a = requests.get(i);
                WasteRockCoefficientRequest b = requests.get(j);
                if (java.util.Objects.equals(a.getExcavationAreaId(), b.getExcavationAreaId())
                        && overlaps(CoalCoefficientService.parsePeriod(a.getPeriod()),
                                    CoalCoefficientService.parsePeriod(b.getPeriod()))) {
                    throw new BadRequestException("Hai dòng cùng khu vực xúc có thời gian chồng lấn nhau trong danh sách gửi lên ("
                            + a.getPeriod().trim() + " và " + b.getPeriod().trim() + ")");
                }
            }
        }
        return requests.stream().map(this::create).toList();
    }

    @Transactional
    public WasteRockCoefficientResponse update(Long id, WasteRockCoefficientRequest request) {
        WasteRockCoefficient entity = find(id);
        apply(entity, request, id);
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<WasteRockCoefficient> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private static boolean overlaps(CoalCoefficientService.Period a, CoalCoefficientService.Period b) {
        return !a.from().isAfter(b.to()) && !b.from().isAfter(a.to());
    }

    private void apply(WasteRockCoefficient entity, WasteRockCoefficientRequest request, Long selfId) {
        CoalCoefficientService.Period p = CoalCoefficientService.parsePeriod(request.getPeriod());
        if (request.getCoefficient().signum() <= 0) {
            throw new BadRequestException("Hệ số đá thải phải lớn hơn 0 (dùng để chia Đá thải tấn ra m3)");
        }
        ExcavationArea area = excavationAreaRepository.findById(request.getExcavationAreaId()).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy khu vực xúc với id: " + request.getExcavationAreaId()));
        LocalDate from = p.from().atDay(1);
        LocalDate to = p.to().atDay(1);
        List<WasteRockCoefficient> clash = repository.findOverlapping(area.getId(), from, to, selfId);
        if (!clash.isEmpty()) {
            WasteRockCoefficient other = clash.get(0);
            throw new BadRequestException("Khu vực xúc \"" + area.getName() + "\" đã có hệ số đá thải trong khoảng "
                    + CoalCoefficientService.format(YearMonth.from(other.getEffectiveFrom())) + " - "
                    + CoalCoefficientService.format(YearMonth.from(other.getEffectiveTo()))
                    + " — thời gian mới " + CoalCoefficientService.format(p.from()) + " - "
                    + CoalCoefficientService.format(p.to()) + " chồng lấn");
        }
        entity.setEffectiveFrom(from);
        entity.setEffectiveTo(to);
        entity.setExcavationArea(area);
        entity.setCoefficient(request.getCoefficient());
        entity.setNote(request.getNote());
    }

    private WasteRockCoefficientResponse toResponse(WasteRockCoefficient e) {
        ExcavationArea a = e.getExcavationArea();
        return WasteRockCoefficientResponse.builder()
                .id(e.getId())
                .period(CoalCoefficientService.format(YearMonth.from(e.getEffectiveFrom())) + " - "
                        + CoalCoefficientService.format(YearMonth.from(e.getEffectiveTo())))
                .excavationAreaId(a != null ? a.getId() : null)
                .excavationAreaName(a != null ? a.getName() : null)
                .coefficient(e.getCoefficient())
                .note(e.getNote())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private WasteRockCoefficient find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy hệ số đá thải với id: " + id));
    }
}
