package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReportPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodAuditResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodResponse;
import com.ecotel.thong_ke_cao_son.enums.ReportPeriodAuditAction;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ReportPeriodMapper;
import com.ecotel.thong_ke_cao_son.model.ProductionResult;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.model.ReportPeriodAudit;
import com.ecotel.thong_ke_cao_son.repository.ProductionResultRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodAuditRepository;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class ReportPeriodService {

    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("d/M");

    /** Mốc chia kỳ mặc định, lấy từ công thức cột DL của Excel (QĐ-05).
     *  Chỉ là GỢI Ý lúc sinh nhanh — người dùng sửa lại thoải mái. */
    private static final int[] DEFAULT_PERIOD_STARTS = {1, 8, 15, 22, 29};

    private final ReportPeriodRepository repository;
    private final ReportPeriodMapper mapper;
    private final ReportPeriodAuditRepository auditRepository;
    private final ProductionResultRepository resultRepository;

    @Transactional(readOnly = true)
    public PageResponse<ReportPeriodResponse> getAll(String keyword, Pageable pageable) {
        Page<ReportPeriodResponse> page = repository.search(keyword, pageable).map(mapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ReportPeriodResponse getById(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public ReportPeriodResponse create(ReportPeriodRequest request) {
        validate(request, null);
        ReportPeriod entity = mapper.toEntity(request);
        applyDefaultDisplayName(entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public List<ReportPeriodResponse> bulkCreate(List<ReportPeriodRequest> requests) {
        // Các dòng trong cùng một lô phải kiểm tra chồng lấn LẪN NHAU nữa —
        // truy vấn DB không thấy được những dòng chưa insert.
        for (int i = 0; i < requests.size(); i++) {
            for (int j = i + 1; j < requests.size(); j++) {
                ReportPeriodRequest a = requests.get(i);
                ReportPeriodRequest b = requests.get(j);
                if (overlaps(a.getFromDate(), a.getToDate(), b.getFromDate(), b.getToDate())) {
                    throw new BadRequestException(
                            "Hai dòng trong danh sách gửi lên bị chồng ngày: dòng "
                                    + (i + 1) + " và dòng " + (j + 1));
                }
            }
        }
        requests.forEach(r -> validate(r, null));
        List<ReportPeriod> entities = requests.stream().map(r -> {
            ReportPeriod e = mapper.toEntity(r);
            applyDefaultDisplayName(e);
            return e;
        }).toList();
        return repository.saveAll(entities).stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public ReportPeriodResponse update(Long id, ReportPeriodRequest request) {
        ReportPeriod entity = find(id);
        rejectIfLocked(entity, "sửa");
        validate(request, id);
        mapper.updateEntity(entity, request);
        applyDefaultDisplayName(entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        ReportPeriod entity = find(id);
        rejectIfLocked(entity, "xoá");
        repository.delete(entity);
    }

    /**
     * Đổi ngày/xoá một kỳ ĐÃ CHỐT sẽ âm thầm làm sai kết quả đã đóng băng —
     * kết quả được tính khớp đúng khoảng ngày cũ, đổi khoảng ngày là phá vỡ
     * căn cứ đó mà không qua vòng mở khoá có ghi vết (QĐ-03). Chặn ở đây để
     * bịt đường vòng: không sửa được calculatePeriod() bằng cách sửa period.
     */
    private void rejectIfLocked(ReportPeriod entity, String action) {
        if (entity.isLocked()) {
            throw new BadRequestException("Kỳ " + entity.getDisplayName()
                    + " đã chốt — mở khoá trước khi " + action + ".");
        }
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<ReportPeriod> found = repository.findAllById(ids);
        repository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    /**
     * Sinh nhanh các kỳ cho một tháng theo mốc mặc định 1/8/15/22/29.
     *
     * <p>Đây là danh mục lặp lại hàng tháng; bắt nhập tay 5 dòng cho 12 tháng
     * là vô lý (QĐ-05). Từ chối nếu tháng đó đã có kỳ — không âm thầm ghi đè
     * dữ liệu người dùng có thể đã sửa tay.
     */
    @Transactional
    public List<ReportPeriodResponse> generateForMonth(int year, int month) {
        if (month < 1 || month > 12) {
            throw new BadRequestException("Tháng phải từ 1 đến 12");
        }
        if (repository.existsByYearAndMonth(year, month)) {
            throw new BadRequestException("Tháng " + month + "/" + year
                    + " đã có kỳ báo cáo. Xoá các kỳ cũ trước nếu muốn sinh lại.");
        }
        YearMonth ym = YearMonth.of(year, month);
        int lastDay = ym.lengthOfMonth();

        List<ReportPeriod> periods = new ArrayList<>();
        for (int i = 0; i < DEFAULT_PERIOD_STARTS.length; i++) {
            int startDay = DEFAULT_PERIOD_STARTS[i];
            if (startDay > lastDay) break;
            // Kỳ cuối luôn kéo tới hết tháng, nên tháng 2 chỉ ra 4 kỳ mà
            // không hở ngày nào.
            int endDay = (i + 1 < DEFAULT_PERIOD_STARTS.length)
                    ? Math.min(DEFAULT_PERIOD_STARTS[i + 1] - 1, lastDay)
                    : lastDay;

            ReportPeriod p = new ReportPeriod();
            p.setYear(year);
            p.setMonth(month);
            p.setPeriodIndex(i + 1);
            p.setFromDate(ym.atDay(startDay));
            p.setToDate(ym.atDay(endDay));
            applyDefaultDisplayName(p);
            periods.add(p);
        }
        return repository.saveAll(periods).stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public List<ReportPeriodResponse> getByMonth(int year, int month) {
        ensureMonthHasPeriod(year, month);
        return repository.findByYearAndMonthOrderByPeriodIndexAsc(year, month)
                .stream().map(mapper::toResponse).toList();
    }

    /**
     * Chủ dự án chốt trực tiếp (2026-09-08): "nếu kỳ bỏ trống thì coi như
     * tính toàn tháng" — tháng nào CHƯA khai bất kỳ kỳ nào thì tự động tạo
     * đúng 1 kỳ trùm cả tháng (ngày 1 → ngày cuối tháng), để không bắt buộc
     * phải vào "Kỳ báo cáo" khai tay trước mới tính được sản lượng. Đây
     * cũng là hook DUY NHẤT cần thiết: {@code calculatePeriod(periodId,...)}
     * luôn đòi periodId trỏ tới 1 kỳ ĐÃ TỒN TẠI (fetch bằng findById), nên
     * không có đường nào gọi tính toán cho 1 tháng còn 0 kỳ mà không đi qua
     * combobox "Kỳ" ở giao diện — chính là nơi gọi hàm này ({@code
     * ReportPeriodController.getByMonth}, dùng cho combobox chọn kỳ).
     *
     * <p>KHÔNG đụng tới tháng đã có BẤT KỲ kỳ nào (kể cả khai dở/hở ngày) —
     * đó là lựa chọn CHỦ ĐỘNG của người dùng tách kỳ theo tuần, vẫn phải
     * qua đúng kiểm tra "không hở" (QĐ-05, {@code assertNoGapInMonth}) như
     * trước, hệ thống không tự động vá hộ.
     */
    @Transactional
    public void ensureMonthHasPeriod(int year, int month) {
        if (repository.existsByYearAndMonth(year, month)) {
            return;
        }
        YearMonth ym = YearMonth.of(year, month);
        ReportPeriod p = new ReportPeriod();
        p.setYear(year);
        p.setMonth(month);
        p.setPeriodIndex(1);
        p.setFromDate(ym.atDay(1));
        p.setToDate(ym.atEndOfMonth());
        p.setNote("Tự động tạo — tháng này chưa khai kỳ riêng nên hệ thống coi cả tháng là 1 kỳ.");
        applyDefaultDisplayName(p);
        try {
            repository.save(p);
        } catch (DataIntegrityViolationException e) {
            // Đụng race hiếm gặp: nơi khác vừa tạo xong đúng lúc mình đang
            // tạo (2 request cùng lúc mở combobox cho cùng 1 tháng chưa
            // khai) — unique constraint (year, month, periodIndex) đã chặn
            // đúng, coi như đã có người tạo xong, không phải lỗi thật.
        }
    }

    /**
     * Tra kỳ chứa một ngày. Ném lỗi rõ ràng nếu ngày đó chưa thuộc kỳ nào —
     * QĐ-05 nói rõ: không âm thầm bỏ qua, cũng không dồn vào kỳ gần nhất.
     */
    @Transactional(readOnly = true)
    public ReportPeriod requirePeriodOf(LocalDate date) {
        return repository.findByDate(date).orElseThrow(() -> new BadRequestException(
                "Ngày " + date + " chưa được khai báo trong danh mục Kỳ báo cáo."));
    }

    // ── kiểm tra ràng buộc ──────────────────────────────────────────────────

    private void validate(ReportPeriodRequest r, Long selfId) {
        if (r.getFromDate().isAfter(r.getToDate())) {
            throw new BadRequestException("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày");
        }
        // Ràng buộc "nằm gọn trong một tháng": khoảng ngày phải khớp đúng
        // năm/tháng đã khai, nếu không thì việc gộp kỳ theo tháng sẽ sai.
        YearMonth declared = YearMonth.of(r.getYear(), r.getMonth());
        if (!YearMonth.from(r.getFromDate()).equals(declared)
                || !YearMonth.from(r.getToDate()).equals(declared)) {
            throw new BadRequestException(
                    "Khoảng ngày của kỳ phải nằm gọn trong tháng " + r.getMonth() + "/" + r.getYear());
        }
        List<ReportPeriod> clashes = repository.findOverlapping(r.getFromDate(), r.getToDate(), selfId);
        if (!clashes.isEmpty()) {
            ReportPeriod c = clashes.get(0);
            throw new BadRequestException("Khoảng ngày bị chồng với kỳ đã có: " + displayNameOf(c)
                    + " (" + c.getFromDate() + " - " + c.getToDate() + ")");
        }
    }

    private static boolean overlaps(LocalDate aFrom, LocalDate aTo, LocalDate bFrom, LocalDate bTo) {
        if (aFrom == null || aTo == null || bFrom == null || bTo == null) return false;
        return !aFrom.isAfter(bTo) && !aTo.isBefore(bFrom);
    }

    private void applyDefaultDisplayName(ReportPeriod p) {
        if (p.getDisplayName() == null || p.getDisplayName().isBlank()) {
            p.setDisplayName(displayNameOf(p));
        }
    }

    private static String displayNameOf(ReportPeriod p) {
        return String.format("Kỳ %02d, %s đến %s",
                p.getPeriodIndex(), DAY_MONTH.format(p.getFromDate()), DAY_MONTH.format(p.getToDate()));
    }

    private ReportPeriod find(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy kỳ báo cáo với id: " + id));
    }

    // ── chốt / mở khoá (QĐ-03) ────────────────────────────────────────────

    /**
     * Chốt kỳ — đóng băng kết quả hiện có, chặn tính lại cho tới khi mở
     * khoá. Đòi kỳ đã tính ít nhất một lần: chốt một kỳ trống là vô nghĩa
     * và dễ nhầm với "đã xong" trong khi thực ra chưa tính gì.
     */
    @Transactional
    public ReportPeriodResponse lock(Long id, String username, String fullName) {
        ReportPeriod period = find(id);
        if (period.isLocked()) {
            throw new BadRequestException("Kỳ " + period.getDisplayName() + " đã chốt rồi.");
        }
        List<ProductionResult> results = resultRepository.findAllByPeriod(id);
        if (results.isEmpty()) {
            throw new BadRequestException("Kỳ " + period.getDisplayName()
                    + " chưa có kết quả tính nào — tính sản lượng trước khi chốt.");
        }

        period.setLocked(true);
        period.setStale(false);
        repository.save(period);

        auditRepository.save(snapshot(period, ReportPeriodAuditAction.LOCK, username, fullName, null, results));
        return mapper.toResponse(period);
    }

    /**
     * Mở khoá — hành động RIÊNG, quyền RIÊNG (gate ở controller bằng action
     * "a", khác quyền "sửa" thường dùng để chốt), bắt buộc lý do, và đánh
     * dấu {@code stale} để giao diện biết báo cáo đang xem đã lỗi thời cho
     * tới khi có bản chốt mới — đúng ba yêu cầu của QĐ-03.
     */
    @Transactional
    public ReportPeriodResponse unlock(Long id, String reason, String username, String fullName) {
        ReportPeriod period = find(id);
        if (!period.isLocked()) {
            throw new BadRequestException("Kỳ " + period.getDisplayName() + " chưa chốt, không cần mở khoá.");
        }

        List<ProductionResult> results = resultRepository.findAllByPeriod(id);
        auditRepository.save(snapshot(period, ReportPeriodAuditAction.UNLOCK, username, fullName, reason, results));

        period.setLocked(false);
        period.setStale(true);
        repository.save(period);
        return mapper.toResponse(period);
    }

    @Transactional(readOnly = true)
    public List<ReportPeriodAuditResponse> getAudits(Long id) {
        find(id); // 404 rõ ràng nếu id sai, thay vì trả mảng rỗng gây hiểu nhầm "chưa có vết nào".
        return auditRepository.findByReportPeriodIdOrderByPerformedAtDesc(id).stream()
                .map(ReportPeriodService::toAuditResponse)
                .toList();
    }

    private ReportPeriodAudit snapshot(ReportPeriod period, ReportPeriodAuditAction action,
                                       String username, String fullName, String reason,
                                       List<ProductionResult> results) {
        Boolean tkeMode = results.isEmpty() ? null : results.get(0).isTkeMode();
        return ReportPeriodAudit.builder()
                .reportPeriod(period)
                .action(action)
                .performedByUsername(username)
                .performedByFullName(fullName)
                .performedAt(LocalDateTime.now())
                .reason(reason)
                .tkeMode(tkeMode)
                .totalM3(sum(results, ProductionResult::getTotalM3))
                .totalTon(sum(results, ProductionResult::getTotalTon))
                .totalTkm(sum(results, ProductionResult::getTotalTkm))
                .build();
    }

    private static ReportPeriodAuditResponse toAuditResponse(ReportPeriodAudit a) {
        return ReportPeriodAuditResponse.builder()
                .id(a.getId())
                .action(a.getAction())
                .performedByUsername(a.getPerformedByUsername())
                .performedByFullName(a.getPerformedByFullName())
                .performedAt(a.getPerformedAt())
                .reason(a.getReason())
                .tkeMode(a.getTkeMode())
                .totalM3(a.getTotalM3())
                .totalTon(a.getTotalTon())
                .totalTkm(a.getTotalTkm())
                .build();
    }

    private static BigDecimal sum(List<ProductionResult> rows, Function<ProductionResult, BigDecimal> f) {
        return rows.stream().map(f).filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
