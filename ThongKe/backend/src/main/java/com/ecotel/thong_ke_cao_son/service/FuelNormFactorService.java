package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.FuelNormFactorRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.FuelNormFactorResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.FuelBsnlType;
import com.ecotel.thong_ke_cao_son.enums.FuelCoalCondition;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.FuelNormFactor;
import com.ecotel.thong_ke_cao_son.model.VehicleRank;
import com.ecotel.thong_ke_cao_son.repository.FuelNormFactorRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleRankRepository;
import com.ecotel.thong_ke_cao_son.service.production.FuelNormFactorSet;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Năm danh mục hệ số của chuỗi ĐMNL / BSNL (theo mùa, theo hạng xe, theo cải tạo ben, HS Than CN-NK, Hệ số BSNL) —
 * dùng chung một bảng, một service; mỗi danh mục là một {@link FuelNormFactorKind}. Xem {@link FuelNormFactor}.
 */
@Service
@RequiredArgsConstructor
public class FuelNormFactorService {

    private final FuelNormFactorRepository repository;
    private final VehicleRankRepository vehicleRankRepository;

    /** Nạp TOÀN BỘ hệ số một lần cho cả kỳ tính (bảng nhỏ) — engine gọi hàm này một lần rồi tra trong bộ nhớ. */
    @Transactional(readOnly = true)
    public FuelNormFactorSet snapshot() {
        return new FuelNormFactorSet(repository.findAll().stream().map(FuelNormFactorService::toRule).toList());
    }

    private static FuelNormFactorSet.Rule toRule(FuelNormFactor e) {
        return new FuelNormFactorSet.Rule(e.getId(), e.getKind(), e.getBsnlType(), e.getEffectiveFrom(), e.getEffectiveTo(),
                e.getVehicleRank() != null ? e.getVehicleRank().getId() : null,
                e.getVehicleType(), e.getVehicleCode(), e.getCargo(), e.getAreaGroup(), e.getMaxDistanceKm(),
                e.getPriority() == null ? 0 : e.getPriority(), e.getRoundDigits(), e.getFactor());
    }

    // ── CRUD theo nhóm ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<FuelNormFactorResponse> getAll(FuelNormFactorKind kind, String keyword, String bsnlTypeLabel,
                                                        String coalConditionLabel, Pageable pageable) {
        String kw = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        FuelBsnlType onlyType = bsnlTypeLabel == null || bsnlTypeLabel.isBlank() ? null : FuelBsnlType.fromLabel(bsnlTypeLabel);
        FuelCoalCondition onlyCondition = coalConditionLabel == null || coalConditionLabel.isBlank()
                ? null : FuelCoalCondition.fromLabel(coalConditionLabel);
        List<FuelNormFactorResponse> all = repository.findByKind(kind).stream()
                .filter(f -> onlyType == null || f.getBsnlType() == onlyType)
                .filter(f -> onlyCondition == null || f.getCoalCondition() == onlyCondition)
                .sorted(Comparator.comparing(FuelNormFactor::getEffectiveFrom).reversed()
                        .thenComparing(f -> f.getPriority() == null ? 0 : f.getPriority()))
                .map(this::toResponse)
                .filter(r -> kw.isEmpty() || searchText(r).contains(kw))
                .toList();
        int from = (int) Math.min(pageable.getOffset(), all.size());
        int to = Math.min(from + pageable.getPageSize(), all.size());
        Page<FuelNormFactorResponse> page = new PageImpl<>(all.subList(from, to), pageable, all.size());
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public FuelNormFactorResponse getById(FuelNormFactorKind kind, Long id) {
        return toResponse(find(kind, id));
    }

    @Transactional
    public FuelNormFactorResponse create(FuelNormFactorKind kind, FuelNormFactorRequest request) {
        FuelNormFactor entity = new FuelNormFactor();
        entity.setKind(kind);
        apply(entity, request, null);
        return toResponse(repository.save(entity));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<FuelNormFactorResponse> bulkCreate(FuelNormFactorKind kind, List<FuelNormFactorRequest> requests) {
        return requests.stream().map(r -> create(kind, r)).toList();
    }

    @Transactional
    public FuelNormFactorResponse update(FuelNormFactorKind kind, Long id, FuelNormFactorRequest request) {
        FuelNormFactor entity = find(kind, id);
        apply(entity, request, id);
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(FuelNormFactorKind kind, Long id) {
        repository.delete(find(kind, id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(FuelNormFactorKind kind, List<Long> ids) {
        List<FuelNormFactor> found = repository.findAllById(ids).stream().filter(f -> f.getKind() == kind).toList();
        repository.deleteAll(found);
        return BulkDeleteResponse.builder().requestedCount(ids.size()).deletedCount(found.size()).build();
    }

    // ── kiểm tra + ghi ──────────────────────────────────────────────────────

    /**
     * Ghi các trường của dòng theo nhóm: cột không thuộc nhóm bị xoá trắng (không lưu dữ liệu thừa).
     * Nhóm theo mùa / theo hạng xe / theo cải tạo ben không được chồng lấn thời gian (cùng hạng xe với nhóm theo hạng xe) —
     * nếu không một tháng sẽ có hai hệ số; HS Than và BSNL cho phép nhiều dòng vì đã có thứ tự xét.
     */
    private void apply(FuelNormFactor e, FuelNormFactorRequest r, Long selfId) {
        FuelNormFactorKind kind = e.getKind();
        CoalCoefficientService.Period p = CoalCoefficientService.parsePeriod(r.getPeriod());
        if (r.getFactor() == null || r.getFactor().signum() < 0
                || (kind != FuelNormFactorKind.BSNL && r.getFactor().signum() == 0)) {
            throw new BadRequestException(kind == FuelNormFactorKind.BSNL
                    ? "Hệ số BSNL không được âm" : "Hệ số phải lớn hơn 0 (hệ số nhân vào định mức nhiên liệu)");
        }

        VehicleRank rank = null;
        if (kind == FuelNormFactorKind.VEHICLE_RANK) {
            if (r.getVehicleRankId() == null) throw new BadRequestException("Hạng xe/máy là bắt buộc");
            rank = vehicleRankRepository.findById(r.getVehicleRankId()).orElseThrow(
                    () -> new ResourceNotFoundException("Không tìm thấy hạng xe/máy với id: " + r.getVehicleRankId()));
        }
        FuelBsnlType bsnlType = null;
        if (kind == FuelNormFactorKind.BSNL) {
            bsnlType = FuelBsnlType.fromLabel(r.getBsnlType());
            if (bsnlType == null) {
                throw new BadRequestException("Loại BSNL không hợp lệ: \"" + r.getBsnlType()
                        + "\" (Roda, Ngày mưa, Bổ túc, SC, BD, Khác, SPNT, Bùn)");
            }
            if (r.getRoundDigits() != null && (r.getRoundDigits() < 0 || r.getRoundDigits() > 6)) {
                throw new BadRequestException("Làm tròn phải từ 0 đến 6 chữ số thập phân");
            }
        }
        boolean usesConditions = kind == FuelNormFactorKind.COAL_CN_NK || kind == FuelNormFactorKind.BSNL;
        FuelCoalCondition coalCondition = null;
        if (kind == FuelNormFactorKind.COAL_CN_NK) {
            coalCondition = FuelCoalCondition.fromLabel(r.getCoalCondition());
            if (coalCondition == null) {
                throw new BadRequestException("Dạng điều kiện HS Than không hợp lệ: \"" + r.getCoalCondition()
                        + "\" (Chủng loại xe, Khu vực + Hàng + Xe, Cung độ + Xe)");
            }
            if (blankToNull(r.getVehicleType()) == null) {
                throw new BadRequestException("Chủng loại xe là bắt buộc");
            }
            if (coalCondition.usesAreaAndCargo()) {
                String area = r.getAreaGroup() == null ? "" : r.getAreaGroup().trim().toUpperCase(Locale.ROOT);
                if (!List.of("CS", "KC").contains(area)) {
                    throw new BadRequestException("Khu vực xúc chỉ nhận nhóm CS hoặc KC");
                }
                if (blankToNull(r.getCargo()) == null) throw new BadRequestException("Chủng loại hàng là bắt buộc");
            }
            if (coalCondition.usesDistance() && (r.getMaxDistanceKm() == null || r.getMaxDistanceKm().signum() <= 0)) {
                throw new BadRequestException("Cung độ toàn tuyến nhỏ hơn (km) là bắt buộc và phải lớn hơn 0");
            }
        }

        if (kind == FuelNormFactorKind.SEASON || kind == FuelNormFactorKind.CAR_RENOVATION
                || kind == FuelNormFactorKind.VEHICLE_RANK) {
            ensureNoOverlap(kind, p, rank == null ? null : rank.getId(), selfId);
        }

        e.setEffectiveFrom(p.from().atDay(1));
        e.setEffectiveTo(p.to().atDay(1));
        e.setFactor(r.getFactor());
        e.setNote(r.getNote());
        e.setVehicleRank(rank);
        e.setBsnlType(bsnlType);
        // BSNL: mỗi loại chỉ có các trường phù hợp (xem FuelBsnlType.uses…); trường không thuộc loại đó bị xoá trắng
        boolean bsnl = kind == FuelNormFactorKind.BSNL;
        e.setVehicleType(usesConditions && (!bsnl || bsnlType.usesVehicleType()) ? blankToNull(r.getVehicleType()) : null);
        e.setVehicleCode(bsnl && bsnlType.usesVehicleCode() ? blankToNull(r.getVehicleCode()) : null);
        e.setCargo(usesConditions && (!bsnl || bsnlType.usesCargo()) ? blankToNull(r.getCargo()) : null);
        // HS Than: mỗi dạng điều kiện chỉ giữ trường của nó; thứ tự xét CHÍNH LÀ thứ tự các dạng (1 → 2 → 3)
        e.setCoalCondition(coalCondition);
        e.setAreaGroup(coalCondition != null && coalCondition.usesAreaAndCargo()
                ? r.getAreaGroup().trim().toUpperCase(Locale.ROOT) : null);
        e.setMaxDistanceKm(coalCondition != null && coalCondition.usesDistance() ? r.getMaxDistanceKm() : null);
        if (coalCondition != null) {
            e.setCargo(coalCondition.usesAreaAndCargo() ? blankToNull(r.getCargo()) : null);
            e.setPriority(coalCondition.getOrder());
        } else {
            Integer priority = null;
            if (usesConditions) {
                boolean keep = !bsnl || bsnlType.usesPriority();
                priority = keep && r.getPriority() != null ? r.getPriority() : Integer.valueOf(0);
            }
            e.setPriority(priority);
        }
        e.setRoundDigits(bsnl && bsnlType.usesRounding() ? r.getRoundDigits() : null);
    }

    private void ensureNoOverlap(FuelNormFactorKind kind, CoalCoefficientService.Period p, Long rankId, Long selfId) {
        LocalDate from = p.from().atDay(1);
        LocalDate to = p.to().atDay(1);
        repository.findByKind(kind).stream()
                .filter(o -> !Objects.equals(o.getId(), selfId))
                .filter(o -> kind != FuelNormFactorKind.VEHICLE_RANK
                        || (o.getVehicleRank() != null && Objects.equals(o.getVehicleRank().getId(), rankId)))
                .filter(o -> !o.getEffectiveFrom().isAfter(to) && !o.getEffectiveTo().isBefore(from))
                .findFirst()
                .ifPresent(o -> {
                    throw new BadRequestException("Thời gian " + CoalCoefficientService.format(p.from()) + " - "
                            + CoalCoefficientService.format(p.to()) + " chồng lấn với dòng đã có "
                            + CoalCoefficientService.format(YearMonth.from(o.getEffectiveFrom())) + " - "
                            + CoalCoefficientService.format(YearMonth.from(o.getEffectiveTo())));
                });
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static String searchText(FuelNormFactorResponse r) {
        return String.join(" ",
                r.getPeriod(), nz(r.getBsnlType()), nz(r.getVehicleRankName()), nz(r.getVehicleType()),
                nz(r.getVehicleCode()), nz(r.getCargo()), nz(r.getAreaGroup()), nz(r.getNote()))
                .toLowerCase(Locale.ROOT);
    }

    private static String nz(String v) {
        return v == null ? "" : v;
    }

    private FuelNormFactorResponse toResponse(FuelNormFactor e) {
        return FuelNormFactorResponse.builder()
                .id(e.getId())
                .period(CoalCoefficientService.format(YearMonth.from(e.getEffectiveFrom())) + " - "
                        + CoalCoefficientService.format(YearMonth.from(e.getEffectiveTo())))
                .bsnlType(e.getBsnlType() != null ? e.getBsnlType().getLabel() : null)
                .coalCondition(e.getCoalCondition() != null ? e.getCoalCondition().getLabel() : null)
                .vehicleRankId(e.getVehicleRank() != null ? e.getVehicleRank().getId() : null)
                .vehicleRankName(e.getVehicleRank() != null ? e.getVehicleRank().getCode() : null)
                .vehicleType(e.getVehicleType())
                .vehicleCode(e.getVehicleCode())
                .cargo(e.getCargo())
                .areaGroup(e.getAreaGroup())
                .maxDistanceKm(e.getMaxDistanceKm())
                .priority(e.getPriority())
                .roundDigits(e.getRoundDigits())
                .factor(e.getFactor())
                .note(e.getNote())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private FuelNormFactor find(FuelNormFactorKind kind, Long id) {
        FuelNormFactor f = repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy hệ số với id: " + id));
        if (f.getKind() != kind) {
            throw new ResourceNotFoundException("Không tìm thấy hệ số với id: " + id);
        }
        return f;
    }
}
