package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.SurveyStandardRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.SurveyStandardResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.SurveyStandard;
import com.ecotel.thong_ke_cao_son.repository.SurveyStandardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/** Danh mục STD (số liệu Trắc địa) — hai màn Đất CN và Đất SX/Than SX. */
@Service
@RequiredArgsConstructor
public class SurveyStandardService {

    private final SurveyStandardRepository repository;

    @Transactional(readOnly = true)
    public PageResponse<SurveyStandardResponse> getAll(
            SurveyStandard.CatalogType catalogType, String keyword, Pageable pageable) {
        return PageResponse.from(repository.search(catalogType, keyword, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public SurveyStandardResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctKeys() {
        return repository.findDistinctKeys();
    }

    @Transactional
    public SurveyStandardResponse create(SurveyStandardRequest request) {
        return toResponse(repository.save(build(new SurveyStandard(), request, null)));
    }

    @Transactional
    public List<SurveyStandardResponse> bulkCreate(List<SurveyStandardRequest> requests) {
        // Chồng lấn giữa các dòng của CÙNG một lô: DB chưa thấy dòng chưa insert.
        for (int i = 0; i < requests.size(); i++) {
            for (int j = i + 1; j < requests.size(); j++) {
                SurveyStandardRequest a = requests.get(i);
                SurveyStandardRequest b = requests.get(j);
                if (a.getCatalogType() == b.getCatalogType()
                        && a.getSeamGroupExcavatorKey().trim().equals(b.getSeamGroupExcavatorKey().trim())
                        && !a.getEffectiveFrom().isAfter(b.getEffectiveTo())
                        && !a.getEffectiveTo().isBefore(b.getEffectiveFrom())) {
                    throw new BadRequestException("Dòng " + (i + 1) + " và dòng " + (j + 1)
                            + " cùng khoá nhưng chồng khoảng hiệu lực.");
                }
            }
        }
        return requests.stream()
                .map(r -> toResponse(repository.save(build(new SurveyStandard(), r, null))))
                .toList();
    }

    @Transactional
    public SurveyStandardResponse update(Long id, SurveyStandardRequest request) {
        return toResponse(repository.save(build(find(id), request, id)));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<SurveyStandard> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /**
     * Thay THẲNG một tập bản ghi: xoá bản ghi cũ rồi tạo bản ghi mới, trong
     * CÙNG một giao dịch — dùng cho màn Sửa (mở lại popup "Thêm mới" ở chế
     * độ ghi, có thể sửa/thêm/xoá dòng rồi lưu đè).
     *
     * <p>Không tách được thành "tạo mới rồi xoá cũ" ở tầng gọi (frontend):
     * trường hợp sửa phổ biến nhất là chỉ đổi số liệu, GIỮ NGUYÊN khoá và
     * thời gian — khi đó bản ghi cũ và bản ghi mới trùng nguyên khoá + ngày,
     * và kiểm tra chồng lấn ({@link #build}) sẽ coi chúng là hai bản ghi
     * CHỒNG NHAU rồi chặn nhầm ngay lúc tạo, trước khi kịp xoá bản cũ.
     *
     * <p>Xoá trước — rồi {@code flush()} ngay để câu kiểm tra chồng lấn (một
     * SELECT riêng, không tự thấy các thay đổi Hibernate chưa ghi xuống) thật
     * sự không còn thấy bản ghi cũ — và tạo mới trong CÙNG một giao dịch:
     * bước tạo lỗi thì Spring rollback luôn cả bước xoá, không có khoảng hở
     * nào để mất dữ liệu giữa chừng.
     */
    @Transactional
    public List<SurveyStandardResponse> replaceBatch(List<Long> deleteIds,
                                                      List<SurveyStandardRequest> creates) {
        if (!deleteIds.isEmpty()) {
            List<SurveyStandard> found = repository.findAllById(deleteIds);
            repository.deleteAll(found);
            repository.flush();
        }
        return bulkCreate(creates);
    }

    /**
     * Tra dòng STD có hiệu lực tại một ngày.
     *
     * <p>Engine tính sản lượng gọi hàm này. Không tra được thì <b>ném lỗi rõ
     * ràng</b>, không trả về giá trị rỗng — thiếu số trắc địa mà vẫn tính
     * tiếp sẽ cho ra hệ số sai mà không có dấu hiệu gì.
     */
    @Transactional(readOnly = true)
    public SurveyStandard resolve(SurveyStandard.CatalogType catalogType, String key, LocalDate date) {
        return repository.findEffective(catalogType, key, date).orElseThrow(
                () -> new BadRequestException("Chưa khai báo STD " + label(catalogType)
                        + " có hiệu lực ngày " + date + " cho khoá \"" + key + "\""));
    }

    @Transactional(readOnly = true)
    public SurveyStandardResponse lookup(SurveyStandard.CatalogType catalogType, String key, LocalDate date) {
        return toResponse(resolve(catalogType, key, date));
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private SurveyStandard build(SurveyStandard entity, SurveyStandardRequest r, Long selfId) {
        if (r.getEffectiveFrom().isAfter(r.getEffectiveTo())) {
            throw new BadRequestException("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày");
        }
        String key = r.getSeamGroupExcavatorKey().trim();

        List<SurveyStandard> clashes = repository.findOverlapping(
                r.getCatalogType(), key, r.getEffectiveFrom(), r.getEffectiveTo(), selfId);
        if (!clashes.isEmpty()) {
            SurveyStandard c = clashes.get(0);
            throw new BadRequestException("Đã có STD " + label(r.getCatalogType())
                    + " cho khoá \"" + key + "\" chồng khoảng ngày: "
                    + c.getEffectiveFrom() + " - " + c.getEffectiveTo());
        }

        entity.setCatalogType(r.getCatalogType());
        entity.setSeamGroupExcavatorKey(key);
        entity.setEffectiveFrom(r.getEffectiveFrom());
        entity.setEffectiveTo(r.getEffectiveTo());

        entity.setEarthAcceptanceProduct(r.getEarthAcceptanceProduct());
        entity.setEarthM3(r.getEarthM3());
        entity.setEarthDesignVolume(r.getEarthDesignVolume());
        entity.setEarthDeviation(r.getEarthDeviation());
        entity.setEarthTon(r.getEarthTon());
        entity.setEarthHaulDistance(r.getEarthHaulDistance());
        entity.setEarthBulkDensity(r.getEarthBulkDensity());
        entity.setEarthTkm(r.getEarthTkm());

        // Khối Than chỉ có nghĩa ở màn Đất SX/Than SX. Xoá sạch khi là Đất CN
        // để không có dữ liệu lạc lối lại được đọc nhầm về sau.
        boolean hasCoal = r.getCatalogType() == SurveyStandard.CatalogType.DAT_SX_THAN_SX;
        entity.setCoalAcceptanceProduct(hasCoal ? r.getCoalAcceptanceProduct() : null);
        entity.setCoalM3(hasCoal ? r.getCoalM3() : null);
        entity.setCoalBulkDensity(hasCoal ? r.getCoalBulkDensity() : null);
        entity.setCoalTon(hasCoal ? r.getCoalTon() : null);
        entity.setCoalDesignVolume(hasCoal ? r.getCoalDesignVolume() : null);
        entity.setCoalDeviation(hasCoal ? r.getCoalDeviation() : null);
        entity.setCoalHaulDistance(hasCoal ? r.getCoalHaulDistance() : null);
        entity.setCoalTkm(hasCoal ? r.getCoalTkm() : null);

        entity.setNote(r.getNote());
        return entity;
    }

    private static String label(SurveyStandard.CatalogType t) {
        return t == SurveyStandard.CatalogType.DAT_CN ? "(Đất CN)" : "(Đất SX/Than SX)";
    }

    private SurveyStandardResponse toResponse(SurveyStandard s) {
        return SurveyStandardResponse.builder()
                .id(s.getId())
                .catalogType(s.getCatalogType())
                .seamGroupExcavatorKey(s.getSeamGroupExcavatorKey())
                .effectiveFrom(s.getEffectiveFrom())
                .effectiveTo(s.getEffectiveTo())
                .earthAcceptanceProduct(s.getEarthAcceptanceProduct())
                .earthM3(s.getEarthM3())
                .earthDesignVolume(s.getEarthDesignVolume())
                .earthDeviation(s.getEarthDeviation())
                .earthTon(s.getEarthTon())
                .earthHaulDistance(s.getEarthHaulDistance())
                .earthBulkDensity(s.getEarthBulkDensity())
                .earthTkm(s.getEarthTkm())
                .coalAcceptanceProduct(s.getCoalAcceptanceProduct())
                .coalM3(s.getCoalM3())
                .coalBulkDensity(s.getCoalBulkDensity())
                .coalTon(s.getCoalTon())
                .coalDesignVolume(s.getCoalDesignVolume())
                .coalDeviation(s.getCoalDeviation())
                .coalHaulDistance(s.getCoalHaulDistance())
                .coalTkm(s.getCoalTkm())
                .note(s.getNote())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private SurveyStandard find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy dòng STD với id: " + id));
    }
}
