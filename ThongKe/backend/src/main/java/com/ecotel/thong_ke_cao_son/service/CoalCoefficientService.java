package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.CoalCoefficientRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CoalCoefficientResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.CoalCoefficient;
import com.ecotel.thong_ke_cao_son.repository.CoalCoefficientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Danh mục Hệ số Than (Hệ số Than TKE trừ đá, Hệ số KCS — theo khoảng tháng) — xem {@link CoalCoefficient}.
 */
@Service
@RequiredArgsConstructor
public class CoalCoefficientService {

    private static final Pattern PERIOD = Pattern.compile(
            "^\\s*(\\d{1,2})\\s*/\\s*(\\d{4})\\s*[-–—]\\s*(\\d{1,2})\\s*/\\s*(\\d{4})\\s*$");

    private final CoalCoefficientRepository repository;

    /** Khoảng thời gian đã tách: hai tháng, bao gồm cả hai đầu. */
    record Period(YearMonth from, YearMonth to) {}

    /**
     * Hệ số nhân vào Tổng KLVC (tấn) của chuyến than sản xuất trong tháng {@code month}:
     * <b>Hệ số KCS ÷ Hệ số Than TKE trừ đá</b> (ô {@code $AM$3} của bảng tính) của dòng có
     * khoảng thời gian chứa tháng đó.
     *
     * <p>Tháng không thuộc dòng nào thì coi bằng 1 (giữ nguyên số tấn) — chủ dự án chốt
     * 2026-11-16. Hệ số Than TKE trừ đá bằng 0 thì từ chối vì không chia được.
     */
    @Transactional(readOnly = true)
    public BigDecimal tonMultiplier(YearMonth month) {
        LocalDate start = month.atDay(1);
        return repository
                .findFirstByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqualOrderByEffectiveFromDesc(start, start)
                .map(c -> divide(c.getKcs(), c.getThanTkeTruDa(), month))
                .orElse(BigDecimal.ONE);
    }

    /** KCS ÷ TKE trừ đá, 10 chữ số thập phân. */
    static BigDecimal divide(BigDecimal kcs, BigDecimal tke, YearMonth month) {
        if (tke == null || tke.signum() == 0) {
            throw new BadRequestException("\"Hệ số Than TKE trừ đá\" của tháng " + format(month)
                    + " trong danh mục Hệ số Than bằng 0 — không chia được");
        }
        return kcs.divide(tke, 10, RoundingMode.HALF_UP);
    }

    /** "09/2026 - 12/2026" → khoảng tháng; sai dạng hoặc từ sau đến thì báo lỗi nghiệp vụ. */
    static Period parsePeriod(String text) {
        Matcher m = PERIOD.matcher(text == null ? "" : text);
        if (!m.matches()) {
            throw new BadRequestException("Thời gian phải có dạng MM/yyyy - MM/yyyy, vd 09/2026 - 12/2026");
        }
        YearMonth from = yearMonth(m.group(1), m.group(2), text);
        YearMonth to = yearMonth(m.group(3), m.group(4), text);
        if (to.isBefore(from)) {
            throw new BadRequestException("Thời gian không hợp lệ: tháng kết thúc " + format(to)
                    + " trước tháng bắt đầu " + format(from));
        }
        return new Period(from, to);
    }

    private static YearMonth yearMonth(String month, String year, String original) {
        int mo = Integer.parseInt(month);
        if (mo < 1 || mo > 12) {
            throw new BadRequestException("Tháng phải từ 1 đến 12 (nhập: " + original.trim() + ")");
        }
        return YearMonth.of(Integer.parseInt(year), mo);
    }

    static String format(YearMonth ym) {
        return String.format(Locale.ROOT, "%02d/%d", ym.getMonthValue(), ym.getYear());
    }

    @Transactional(readOnly = true)
    public PageResponse<CoalCoefficientResponse> getAll(String keyword, Pageable pageable) {
        String kw = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        // Bảng nhỏ (mỗi dòng một khoảng tháng) → lọc/sắp xếp trong bộ nhớ, tránh phụ thuộc hàm định dạng ngày của DB.
        List<CoalCoefficientResponse> all = repository.findAll().stream()
                .sorted(Comparator.comparing(CoalCoefficient::getEffectiveFrom).reversed())
                .map(this::toResponse)
                .filter(r -> kw.isEmpty()
                        || r.getPeriod().toLowerCase(Locale.ROOT).contains(kw)
                        || (r.getNote() != null && r.getNote().toLowerCase(Locale.ROOT).contains(kw)))
                .toList();
        int from = (int) Math.min(pageable.getOffset(), all.size());
        int to = Math.min(from + pageable.getPageSize(), all.size());
        Page<CoalCoefficientResponse> page = new PageImpl<>(all.subList(from, to), pageable, all.size());
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public CoalCoefficientResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public CoalCoefficientResponse create(CoalCoefficientRequest request) {
        ensureNoOverlap(parsePeriod(request.getPeriod()), null);
        CoalCoefficient entity = new CoalCoefficient();
        apply(entity, request);
        return toResponse(repository.save(entity));
    }

    /** Tạo nhiều bản ghi trong một lần — màn "Thêm mới" cho nhập nhiều dòng. */
    @Transactional
    public List<CoalCoefficientResponse> bulkCreate(List<CoalCoefficientRequest> requests) {
        List<Period> periods = requests.stream().map(r -> parsePeriod(r.getPeriod())).toList();
        for (int i = 0; i < periods.size(); i++) {
            for (int j = i + 1; j < periods.size(); j++) {
                if (overlaps(periods.get(i), periods.get(j))) {
                    throw new BadRequestException("Thời gian " + format(periods.get(i).from()) + " - "
                            + format(periods.get(i).to()) + " chồng lấn với " + format(periods.get(j).from())
                            + " - " + format(periods.get(j).to()) + " trong danh sách gửi lên");
                }
            }
        }
        return requests.stream().map(this::create).toList();
    }

    @Transactional
    public CoalCoefficientResponse update(Long id, CoalCoefficientRequest request) {
        CoalCoefficient entity = find(id);
        ensureNoOverlap(parsePeriod(request.getPeriod()), id);
        apply(entity, request);
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<CoalCoefficient> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private static boolean overlaps(Period a, Period b) {
        return !a.from().isAfter(b.to()) && !b.from().isAfter(a.to());
    }

    private void apply(CoalCoefficient entity, CoalCoefficientRequest request) {
        Period p = parsePeriod(request.getPeriod());
        entity.setEffectiveFrom(p.from().atDay(1));
        entity.setEffectiveTo(p.to().atDay(1));
        entity.setThanTkeTruDa(request.getThanTkeTruDa());
        entity.setKcs(request.getKcs());
        entity.setNote(request.getNote());
    }

    private CoalCoefficientResponse toResponse(CoalCoefficient e) {
        return CoalCoefficientResponse.builder()
                .id(e.getId())
                .period(format(YearMonth.from(e.getEffectiveFrom())) + " - " + format(YearMonth.from(e.getEffectiveTo())))
                .thanTkeTruDa(e.getThanTkeTruDa())
                .kcs(e.getKcs())
                .note(e.getNote())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private CoalCoefficient find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy hệ số than với id: " + id));
    }

    /** Các dòng không được chồng lấn thời gian — nếu không một tháng sẽ có hai hệ số. */
    private void ensureNoOverlap(Period p, Long selfId) {
        LocalDate from = p.from().atDay(1);
        LocalDate to = p.to().atDay(1);
        List<CoalCoefficient> clash = selfId == null
                ? repository.findByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqual(to, from)
                : repository.findByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqualAndIdNot(to, from, selfId);
        if (!clash.isEmpty()) {
            CoalCoefficient other = clash.get(0);
            throw new BadRequestException("Thời gian " + format(p.from()) + " - " + format(p.to())
                    + " chồng lấn với dòng đã có " + format(YearMonth.from(other.getEffectiveFrom())) + " - "
                    + format(YearMonth.from(other.getEffectiveTo())));
        }
    }
}
