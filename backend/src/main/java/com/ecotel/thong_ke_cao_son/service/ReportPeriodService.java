package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReportPeriodRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReportPeriodResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ReportPeriodMapper;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportPeriodService {

    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("d/M");

    /** Mốc chia kỳ mặc định, lấy từ công thức cột DL của Excel (QĐ-05).
     *  Chỉ là GỢI Ý lúc sinh nhanh — người dùng sửa lại thoải mái. */
    private static final int[] DEFAULT_PERIOD_STARTS = {1, 8, 15, 22, 29};

    private final ReportPeriodRepository repository;
    private final ReportPeriodMapper mapper;

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
        validate(request, id);
        mapper.updateEntity(entity, request);
        applyDefaultDisplayName(entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
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

    @Transactional(readOnly = true)
    public List<ReportPeriodResponse> getByMonth(int year, int month) {
        return repository.findByYearAndMonthOrderByPeriodIndexAsc(year, month)
                .stream().map(mapper::toResponse).toList();
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
}
