package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.PeriodNotFullyApprovedException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.service.SurveyStandardService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FlushModeType;
import jakarta.persistence.PersistenceContext;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Engine tính sản lượng cho MỘT KỲ.
 *
 * <h2>Vì sao không tính từng chuyến một</h2>
 *
 * Hệ số trắc địa bằng <i>số trắc địa ÷ tổng cộng dồn của cả kỳ</i>, mà tổng
 * ấy lại cộng từ chính kết quả của từng chuyến. Rồi hệ số đó được áp NGƯỢC
 * trở lại từng chuyến. Nên phép tính có <b>hai lượt trên chuyến, xen giữa là
 * một rào chắn tổng hợp</b>:
 *
 * <pre>
 * Lượt 1   AL, AM, AN                       (từng chuyến)
 *   ├─ gộp theo (khoá, SPNT) → sinh AP Tdia; HS = STD ÷ Σ (m3: ΣAL, tấn: ΣAM, tkm: ΣAN)
 * Lượt 2   DS = AL × HS m3
 *          DW = AM × HS tấn
 *          DX = AN × HS tkm                 (từng chuyến; CTNB: nhân hệ số chênh lệch riêng)
 * </pre>
 *
 * <p>Tổng DS/DW/DX theo khoá = STD tương ứng, và bảng Áp trắc địa (tổng + hệ số) chính là dữ liệu
 * của báo cáo thống kê — hai màn là MỘT nguồn (chủ dự án chốt 2026-11-16).
 *
 * <p>2026-11-16 (chủ dự án): BỎ chế độ TKE và BỎ lượt 3 (Tấn cuối cùng / Tkm cuối cùng, kèm rào chắn
 * Ap Tkm) — chốt Báo chuyến là chốt luôn Thống kê sản lượng. Dữ liệu cũ (kỳ đã tính trước đó) còn các
 * cột đó cho tới khi tính lại.
 *
 * <p>Hệ quả cần nhớ: <b>kết quả của một chuyến phụ thuộc các chuyến khác
 * cùng kỳ.</b> Sửa một chuyến thì phải tính lại cả kỳ, không thể tính bù
 * riêng chuyến đó.
 */
@Service
@RequiredArgsConstructor
public class ProductionCalculationService {

    private static final Logger log = LoggerFactory.getLogger(ProductionCalculationService.class);

    /** Nhóm chủng loại hàng bắt đầu bằng chuỗi này thì đi nhánh CTNB. */
    private static final String CTNB_PREFIX = "TCN";

    private static final int HS_SCALE = 10;
    private static final int VALUE_SCALE = 6;

    /** Không đưa vào constructor để các test thuần Mockito dựng service không phải đổi; null trong test. */
    @PersistenceContext
    private EntityManager entityManager;

    private final ReportPeriodRepository periodRepository;
    private final TransportReportTripRepository tripRepository;
    private final SurveyStandardRepository surveyStandardRepository;
    private final SurveyCoefficientRepository coefficientRepository;
    private final ProductionResultRepository resultRepository;
    private final ReconciliationDecisionRepository reconciliationDecisionRepository;
    private final TripBaseCalculator baseCalculator;
    private final FuelCalculator fuelCalculator;
    private final com.ecotel.thong_ke_cao_son.service.MatrixCatalogService matrixService;

    /** Tóm tắt một lần chạy, trả về cho người bấm nút tính. */
    @Getter
    public static class CalculationSummary {
        private final int tripCount;
        private final int coefficientRowCount;
        private final List<String> warnings;
        /** Số chuyến Vận tải bị BỎ QUA vì chưa duyệt đối chiếu (QĐ-25); luôn 0 ở chế độ nghiêm ngặt. */
        private final int excludedTripCount;

        CalculationSummary(int tripCount, int coefficientRowCount, List<String> warnings,
                           int excludedTripCount) {
            this.tripCount = tripCount;
            this.coefficientRowCount = coefficientRowCount;
            this.warnings = warnings;
            this.excludedTripCount = excludedTripCount;
        }
    }

    /**
     * Tính lại toàn bộ một kỳ — chế độ NGHIÊM NGẶT (QĐ-16): còn chuyến chưa
     * duyệt thì từ chối. Đây là chế độ của tính lại TỰ ĐỘNG sau mỗi lần duyệt
     * ({@link ProductionAutoRecalculateListener}).
     */
    @Transactional
    public CalculationSummary calculatePeriod(Long periodId) {
        return calculatePeriod(periodId, false);
    }

    /**
     * Tính lại toàn bộ một kỳ.
     *
     * <p>Luôn xoá kết quả cũ của kỳ trước khi tính: giữ lại sẽ sinh ra hai
     * thế hệ số liệu lẫn lộn trong cùng một kỳ.
     *
     * @param onlyApproved QĐ-25 (nới QĐ-16, chủ dự án chốt 2026-11-04): {@code true} =
     *     chỉ tính các chuyến Vận tải ĐÃ DUYỆT đối chiếu (cả hai bên khớp cặp), BỎ QUA
     *     chuyến chưa duyệt thay vì từ chối cả kỳ — số chuyến bị bỏ qua được báo lại
     *     trong {@link CalculationSummary#getExcludedTripCount()} và cảnh báo, không
     *     âm thầm. {@code false} = nghiêm ngặt như QĐ-16 gốc.
     */
    @Transactional
    public CalculationSummary calculatePeriod(Long periodId, boolean onlyApproved) {
        // Vài chục nghìn thực thể (chuyến + quan hệ + quyết định đối chiếu) nằm trong persistence
        // context suốt lần tính, mà mỗi chuyến lại tra DB (tỷ trọng, hệ số...) → mặc định mỗi truy
        // vấn kích hoạt một lượt auto-flush + dirty-check TOÀN BỘ thực thể đó: chi phí tăng theo
        // bình phương số chuyến (kỳ ~10 nghìn chuyến chạy hơn 15 phút, nginx cắt 504 sau 300 s).
        // Trong lúc tính KHÔNG có thay đổi nào cần flush trước truy vấn (xoá kết quả cũ là DELETE
        // JPQL chạy ngay; kết quả mới chỉ ghi ở cuối) → chuyển sang FlushMode.COMMIT: vẫn flush
        // đủ một lần khi commit, chỉ bỏ các lượt flush giữa chừng.
        FlushModeType previousFlushMode = null;
        if (entityManager != null) {
            previousFlushMode = entityManager.getFlushMode();
            entityManager.setFlushMode(FlushModeType.COMMIT);
        }
        try {
            return doCalculatePeriod(periodId, onlyApproved);
        } finally {
            if (entityManager != null && previousFlushMode != null) {
                entityManager.setFlushMode(previousFlushMode);
            }
        }
    }

    private CalculationSummary doCalculatePeriod(Long periodId, boolean onlyApproved) {
        ReportPeriod period = periodRepository.findById(periodId).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy kỳ báo cáo id: " + periodId));

        // QĐ-03: kỳ đã CHỐT là bất biến — không cho tính lại cho tới khi mở
        // khoá qua endpoint riêng, có quyền riêng, ghi vết. Trước 2026-09-07
        // hàm này ghi đè kết quả một kỳ đã chốt bất cứ lúc nào, không ai
        // ngăn, không ai biết. Phát hiện qua Quality Gate của Codex.
        if (period.isLocked()) {
            throw new BadRequestException("Kỳ " + period.getDisplayName()
                    + " đã chốt — mở khoá trước khi tính lại (mục Kỳ báo cáo).");
        }

        // QĐ-05 ràng buộc 2 ("không hở") cố tình để kiểm tra Ở ĐÂY, không lúc
        // khai báo danh mục — vì "lúc đang khai báo dở dang thì hở là chuyện
        // bình thường". Trước 2026-09-07 hàm này chưa từng được gọi (dead
        // code `requirePeriodOf`), nên chuyến rơi vào ngày chưa khai kỳ nào
        // âm thầm biến mất khỏi mọi báo cáo — không kỳ nào (kể cả kỳ liền kề)
        // từng đọc tới nó. Phát hiện qua Quality Gate của Codex.
        assertNoGapInMonth(period);

        List<TransportReportTrip> trips = tripRepository.findByReportDateBetween(
                period.getFromDate(), period.getToDate());
        if (trips.isEmpty()) {
            throw new BadRequestException("Kỳ " + period.getDisplayName()
                    + " (" + period.getFromDate() + " - " + period.getToDate()
                    + ") chưa có chuyến vận tải nào để tính.");
        }

        // Chủ dự án chốt trực tiếp (2026-09-08): CHỈ dữ liệu ĐÃ ĐƯỢC THỐNG KÊ
        // DUYỆT qua màn Đối chiếu mới là "chuẩn" để tính sản lượng — trước đây
        // engine tính từ MỌI chuyến bất kể trạng thái duyệt, không đúng nghiệp
        // vụ (dữ liệu tạm dùng để đối chiếu sai lệch không được coi là chuẩn).
        // Đúng phong cách QĐ-04/QĐ-06 đã có trong file này: báo lỗi TỔNG HỢP rõ
        // ràng, không âm thầm tính thiếu chuyến chưa duyệt. Áp dụng ngay cho MỌI
        // kỳ kể cả kỳ cũ — chủ dự án đã xác nhận chấp nhận rủi ro kỳ cũ tạm
        // không tính lại được cho tới khi duyệt bù qua Đối chiếu.
        //
        // Quality Gate lượt 7 của Codex (2026-09-16) — lỗ hổng thật: kiểm tra
        // BAN ĐẦU chỉ đọc {@code TransportReportTrip.status}, hoàn toàn không
        // xác minh chuyến Khai thác GHÉP CẶP có tồn tại hay đã duyệt hay chưa.
        // ReconciliationService.buildDecision() trước đây chỉ gọi
        // assertValidPair() khi request gửi ĐỦ CẢ HAI id — request chỉ gửi
        // transportReportTripId vẫn duyệt được TransportReportTrip riêng lẻ
        // (giờ đã chặn ở ReconciliationService, xem assertValidPair/
        // buildDecision), nhưng engine này vẫn phải tự vệ ĐỘC LẬP (defense in
        // depth) — không được tin dữ liệu cũ/dữ liệu tạo qua đường khác chỉ vì
        // cờ APPROVED đã bật trên 1 phía. Tra CÙNG quyết định đối chiếu
        // (ReconciliationDecision) đã gắn cho từng chuyến Vận tải: phải có
        // chuyến Khai thác ghép cặp VÀ chuyến đó cũng đã APPROVED.
        Map<Long, ReconciliationDecision> decisionByTransportTripId =
                reconciliationDecisionRepository
                        .findByTransportReportTrip_IdIn(trips.stream().map(TransportReportTrip::getId).toList())
                        .stream()
                        .collect(java.util.stream.Collectors.toMap(
                                d -> d.getTransportReportTrip().getId(), d -> d));

        List<String> notApprovedIssues = trips.stream()
                .map(t -> describeProductionApprovalIssue(t, decisionByTransportTripId.get(t.getId())))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (!notApprovedIssues.isEmpty() && !onlyApproved) {
            throw new PeriodNotFullyApprovedException(buildAggregateError(
                    "Kỳ " + period.getDisplayName() + " chưa thể tính vì còn "
                            + notApprovedIssues.size() + " chuyến VẬN TẢI CHƯA ĐƯỢC DUYỆT ĐỐI CHIẾU"
                            + " (chỉ dữ liệu đã duyệt mới là \"chuẩn\" để tính sản lượng):",
                    notApprovedIssues));
        }

        // QĐ-25: chế độ "chỉ tính phần đã duyệt" — giữ lại ĐÚNG những chuyến vượt
        // qua cùng bộ kiểm tra ở trên (APPROVED + có chuyến Khai thác ghép cặp
        // cũng APPROVED), phần còn lại nằm ngoài kỳ và được đếm để báo lại.
        List<TransportReportTrip> eligibleTrips = trips;
        int excludedTripCount = 0;
        if (!notApprovedIssues.isEmpty()) {
            eligibleTrips = selectApprovedTrips(trips, decisionByTransportTripId);
            excludedTripCount = trips.size() - eligibleTrips.size();
            if (eligibleTrips.isEmpty()) {
                throw new PeriodNotFullyApprovedException(buildAggregateError(
                        "Kỳ " + period.getDisplayName() + " chưa có chuyến Vận tải nào đã duyệt đối chiếu"
                                + " — không có gì để tính (còn " + excludedTripCount + " chuyến chưa duyệt):",
                        notApprovedIssues));
            }
        }

        resultRepository.deleteByPeriod(periodId);
        coefficientRepository.deleteByPeriod(periodId);

        // Tên gọi "warnings" giữ nguyên vì đã lan khắp FuelCalculator và các
        // hàm dưới đây, nhưng NGỮ NGHĨA đã đổi (2026-09-07, sau Quality Gate
        // của Codex): mọi dòng thêm vào đây là TRA TRƯỢT MỘT THAM SỐ ĐỊNH MỨC
        // BẮT BUỘC (STD, Tỷ trọng, Thể trọng, ĐMNL, Năng suất xe, HS điều
        // chỉnh, hệ số bùn…). QĐ-04 và QĐ-06 đều nói rõ: tra trượt phải "báo
        // lỗi nghiệp vụ rõ ràng, tuyệt đối không âm thầm lấy 0" — nên list
        // này không còn là "cảnh báo rồi vẫn lưu" nữa. Cuối hàm, nếu list còn
        // phần tử thì NÉM LỖI TỔNG HỢP thay vì lưu — xem khối kiểm tra ngay
        // trước `coefficientRepository.saveAll(...)`.
        List<String> warnings = new ArrayList<>();

        // ── LƯỢT 1 ──────────────────────────────────────────────────────────
        List<TripBaseResult> base = eligibleTrips.stream().map(baseCalculator::calculate).toList();

        // ── RÀO CHẮN 1: gộp theo (khoá, SPNT) → AP Tdia ─────────────────────
        Map<GroupKey, List<TripBaseResult>> groups = new LinkedHashMap<>();
        for (TripBaseResult r : base) {
            groups.computeIfAbsent(
                    new GroupKey(r.getSeamGroupExcavatorKey(), r.getAcceptanceProduct()),
                    k -> new ArrayList<>()).add(r);
        }

        Map<GroupKey, SurveyCoefficient> apTdia = new LinkedHashMap<>();
        for (Map.Entry<GroupKey, List<TripBaseResult>> e : groups.entrySet()) {
            apTdia.put(e.getKey(),
                    buildApTdia(period, e.getKey(), e.getValue(), warnings));
        }

        // ── LƯỢT 2 ──────────────────────────────────────────────────────────
        List<Stage2> stage2 = new ArrayList<>();
        for (TripBaseResult r : base) {
            GroupKey gk = new GroupKey(r.getSeamGroupExcavatorKey(), r.getAcceptanceProduct());
            stage2.add(applyStage2(r, apTdia.get(gk), warnings));
        }

        // ── Nhánh nhiên liệu: nạp ba lưới MỘT LẦN cho cả kỳ ─────────────────
        // Nạp trong vòng lặp thì mỗi chuyến một lần đọc cả lưới — kỳ vài nghìn
        // chuyến sẽ đọc lại cùng dữ liệu vài nghìn lần.
        // Kỳ nằm gọn trong một tháng (QĐ-05) và định mức đổi theo tháng, nên
        // một kỳ chỉ ứng với một phiên bản — nạp theo ngày đầu kỳ là đủ.
        //
        // QĐ-25: ở chế độ "chỉ tính chuyến đã duyệt", thiếu định mức NHIÊN LIỆU /
        // NĂNG SUẤT (DMNL, HS điều chỉnh, Năng suất xe) KHÔNG chặn sản lượng
        // (m3/tấn/Tkm không dùng các định mức này — đúng ý đồ ghi ở FuelCalculator).
        // Ô nhiên liệu của chuyến đó để TRỐNG (null, không phải 0 — giống #N/A của
        // Excel) và số chuyến + nguyên nhân được báo lại ở cảnh báo, không âm thầm.
        // Chế độ nghiêm ngặt giữ nguyên QĐ-04/QĐ-06: thiếu là từ chối.
        List<String> fuelWarnings = onlyApproved ? new ArrayList<>() : warnings;
        Map<String, MatrixGridResponse> grids = loadFuelGrids(period.getFromDate(), fuelWarnings);
        // Hệ số ĐMNL / BSNL từ các danh mục (theo mùa, hạng xe, cải tạo ben, HS Than, BSNL) — nạp MỘT lần cho cả kỳ.
        FuelNormFactorSet factors = fuelCalculator.loadFactors();

        // ── Dựng kết quả từng chuyến (không còn lượt 3) ─────────────────────
        List<ProductionResult> results = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (Stage2 s : stage2) {
            GroupKey gk = new GroupKey(s.base.getSeamGroupExcavatorKey(), s.base.getAcceptanceProduct());
            ProductionResult result = buildResult(period, s, apTdia.get(gk), now);
            applyFuel(result, s.base(), grids, factors, fuelWarnings);
            results.add(result);
        }

        // Tra trượt tham số bắt buộc ở BẤT KỲ chuyến/nhóm nào → KHÔNG lưu gì
        // hết, ném MỘT lỗi tổng hợp liệt kê đủ các chỗ thiếu (QĐ-04/QĐ-06:
        // "tuyệt đối không âm thầm lấy 0"). @Transactional cuộn lại cả hai
        // deleteByPeriod ở trên, nên kết quả kỳ trước đó vẫn nguyên vẹn.
        //
        // Cố tình gom hết rồi báo MỘT LẦN thay vì dừng ở lỗi đầu tiên: người
        // dùng cần biết TOÀN BỘ danh sách còn thiếu để đi khai đủ trong một
        // lượt, không phải sửa-chạy-lại từng cái một.
        if (!warnings.isEmpty()) {
            throw new BadRequestException(buildAggregateError(
                    "Chưa tính được kỳ này vì còn " + warnings.stream().distinct().count()
                            + " chỗ thiếu khai báo:", warnings));
        }

        coefficientRepository.saveAll(apTdia.values());
        resultRepository.saveAll(results);

        // Tính THÀNH CÔNG -> báo cáo đang hiển thị không còn lỗi thời nữa,
        // dù trước đó có bị đánh dấu stale vì lần TỰ ĐỘNG tính lại nào đó
        // thất bại (xem ProductionAutoRecalculateListener, Quality Gate lượt
        // 3 của Codex, 2026-09-10) hay vì vừa mở khoá (QĐ-03). Không tắt cờ
        // này thì "stale" sẽ kẹt true mãi sau khi sửa lỗi + tính lại thành
        // công — chỉ báo lỗi được nửa vòng đời, không đóng được vòng lặp.
        if (period.isStale()) {
            period.setStale(false);
            periodRepository.save(period);
        }

        log.info("Tính sản lượng kỳ {}: {} chuyến, {} dòng hệ số, bỏ qua {} chuyến chưa duyệt",
                period.getDisplayName(), results.size(), apTdia.size(), excludedTripCount);

        List<String> notices = new ArrayList<>(warnings);
        if (onlyApproved && !fuelWarnings.isEmpty()) {
            notices.add(summarizeFuelWarnings(fuelWarnings));
        }
        // Danh mục hệ số ĐMNL/BSNL chưa có dòng nào → hệ số đang là mặc định (ĐMNL = 1, BSNL = 0); nói rõ để không ai
        // đọc nhầm số nhiên liệu là đã áp đủ hệ số.
        if (factors != null && !factors.missingKinds().isEmpty()) {
            notices.add("Danh mục hệ số nhiên liệu chưa khai dòng nào: " + factors.missingKinds().stream()
                    .map(ProductionCalculationService::factorKindLabel).collect(java.util.stream.Collectors.joining(", "))
                    + " — hệ số ĐMNL đang là 1, BSNL đang là 0 cho các nhóm đó.");
        }
        if (excludedTripCount > 0) {
            notices.add("Kỳ mới được tính trên phần ĐÃ DUYỆT đối chiếu: " + results.size()
                    + " chuyến Vận tải đã tính, " + excludedTripCount
                    + " chuyến chưa duyệt đối chiếu KHÔNG nằm trong số liệu (duyệt thêm rồi tính lại kỳ để đưa vào).");
        }
        return new CalculationSummary(results.size(), apTdia.size(), notices, excludedTripCount);
    }

    private static String factorKindLabel(com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind kind) {
        return switch (kind) {
            case SEASON -> "Hệ số ĐMNL theo mùa";
            case VEHICLE_RANK -> "Hệ số ĐMNL theo hạng xe";
            case CAR_RENOVATION -> "Hệ số ĐMNL theo cải tạo ben";
            case COAL_CN_NK -> "Hệ số Than (CN-NK)";
            case BSNL -> "Hệ số BSNL";
        };
    }

    private static final int MAX_FUEL_REASONS_IN_NOTICE = 5;

    /**
     * Gộp cảnh báo nhiên liệu/năng suất theo NGUYÊN NHÂN (bỏ tiền tố "Chuyến id=N: ") và đếm số
     * chuyến, để một dòng cảnh báo nói được "thiếu gì, bao nhiêu chuyến" thay vì hàng nghìn dòng.
     */
    static String summarizeFuelWarnings(List<String> fuelWarnings) {
        Map<String, Integer> byReason = new LinkedHashMap<>();
        for (String w : fuelWarnings) {
            byReason.merge(w.replaceFirst("^Chuyến id=\\d+: ", ""), 1, Integer::sum);
        }
        String top = byReason.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(MAX_FUEL_REASONS_IN_NOTICE)
                .map(e -> e.getKey() + " (" + e.getValue() + " chuyến)")
                .collect(java.util.stream.Collectors.joining("; "));
        String more = byReason.size() > MAX_FUEL_REASONS_IN_NOTICE
                ? " … và " + (byReason.size() - MAX_FUEL_REASONS_IN_NOTICE) + " nguyên nhân khác" : "";
        return "Nhiên liệu/năng suất để TRỐNG (thiếu định mức, như #N/A của Excel — không phải 0) ở "
                + fuelWarnings.size() + " lượt tra; sản lượng m3/tấn/Tkm không bị ảnh hưởng: " + top + more + ".";
    }

    /**
     * Các chuyến đủ điều kiện tính sản lượng (QĐ-16/QĐ-25): cùng tiêu chí với
     * {@link #describeProductionApprovalIssue}, giữ nguyên thứ tự đầu vào.
     */
    private List<TransportReportTrip> selectApprovedTrips(
            List<TransportReportTrip> trips, Map<Long, ReconciliationDecision> decisionByTransportTripId) {
        return trips.stream()
                .filter(t -> describeProductionApprovalIssue(t, decisionByTransportTripId.get(t.getId())) == null)
                .toList();
    }

    /**
     * Trả về mô tả lỗi nếu chuyến Vận tải {@code t} CHƯA đủ điều kiện tính sản
     * lượng, hoặc {@code null} nếu đã đủ (Quality Gate lượt 7 của Codex,
     * 2026-09-16 — xem chú thích ở {@link #calculatePeriod}). Ba trường hợp bị
     * chặn:
     * <ol>
     *   <li>{@code t.status != APPROVED} — như cũ.</li>
     *   <li>{@code t.status == APPROVED} nhưng KHÔNG có {@link ReconciliationDecision}
     *       nào gắn chuyến Khai thác ghép cặp — tức từng được duyệt RIÊNG LẺ
     *       một phía (lỗ hổng thật đã chặn ở nguồn tại
     *       {@code ReconciliationService}, nhưng ở đây tự vệ độc lập, không
     *       tin ngược lại dữ liệu cũ/đường ghi khác).</li>
     *   <li>Có chuyến Khai thác ghép cặp nhưng CHÍNH chuyến đó chưa
     *       {@code APPROVED} — 2 bên phải CÙNG duyệt mới coi là "chuẩn".</li>
     * </ol>
     */
    private String describeProductionApprovalIssue(TransportReportTrip t, ReconciliationDecision decision) {
        if (t.getStatus() != ApprovalStatus.APPROVED) {
            return "Chuyến #" + t.getId() + " ngày " + t.getTransportReport().getReportDate()
                    + ", xe " + t.getTransportReport().getVehicle().getCode()
                    + " — trạng thái đối chiếu: " + t.getStatus();
        }
        ExcavationReportTrip excavationTrip = decision != null ? decision.getExcavationReportTrip() : null;
        if (excavationTrip == null) {
            return "Chuyến #" + t.getId() + " ngày " + t.getTransportReport().getReportDate()
                    + ", xe " + t.getTransportReport().getVehicle().getCode()
                    + " — ĐÃ DUYỆT Vận tải nhưng CHƯA có chuyến Khai thác ghép cặp tương ứng"
                    + " (duyệt một phía không hợp lệ, cần đối chiếu đủ cả hai bên).";
        }
        if (excavationTrip.getStatus() != ApprovalStatus.APPROVED) {
            return "Chuyến #" + t.getId() + " ngày " + t.getTransportReport().getReportDate()
                    + ", xe " + t.getTransportReport().getVehicle().getCode()
                    + " — chuyến Khai thác ghép cặp #" + excavationTrip.getId()
                    + " CHƯA được duyệt (trạng thái: " + excavationTrip.getStatus() + ").";
        }
        return null;
    }

    private static final int MAX_ERRORS_IN_MESSAGE = 15;

    /** Gộp danh sách lỗi thành một thông báo dưới {@code header} — cắt bớt nếu quá dài. */
    private String buildAggregateError(String header, List<String> issues) {
        List<String> distinct = issues.stream().distinct().toList();
        StringBuilder sb = new StringBuilder(header).append("\n");
        distinct.stream().limit(MAX_ERRORS_IN_MESSAGE).forEach(w -> sb.append("- ").append(w).append("\n"));
        if (distinct.size() > MAX_ERRORS_IN_MESSAGE) {
            sb.append("… và ").append(distinct.size() - MAX_ERRORS_IN_MESSAGE).append(" chỗ khác.");
        }
        return sb.toString();
    }

    /**
     * QĐ-05 ràng buộc 2 — mọi ngày trong tháng của {@code period} phải thuộc
     * ĐÚNG MỘT kỳ đã khai, không hở. Không kiểm tra chồng lấn ở đây: đã chặn
     * lúc khai báo (xem {@code ReportPeriodService.validate}); ở đây chỉ lo
     * phần còn lại — khoảng trống mà lúc khai báo không thể tự phát hiện
     * (vd người dùng xoá bớt kỳ giữa tháng sau khi đã khai đủ).
     */
    private void assertNoGapInMonth(ReportPeriod period) {
        List<ReportPeriod> monthPeriods = periodRepository
                .findByYearAndMonthOrderByPeriodIndexAsc(period.getYear(), period.getMonth())
                .stream()
                .sorted(Comparator.comparing(ReportPeriod::getFromDate))
                .toList();

        java.time.YearMonth ym = java.time.YearMonth.of(period.getYear(), period.getMonth());
        java.time.LocalDate cursor = ym.atDay(1);
        for (ReportPeriod p : monthPeriods) {
            if (p.getFromDate().isAfter(cursor)) {
                throw gapError(period, cursor, p.getFromDate().minusDays(1));
            }
            // fromDate < cursor nghĩa là chồng lấn với kỳ trước — đã bị chặn
            // lúc khai báo, không lặp lại kiểm tra ở đây; chỉ đẩy cursor tới
            // biên xa nhất đã phủ được để dò tiếp phần còn lại của tháng.
            if (p.getToDate().plusDays(1).isAfter(cursor)) {
                cursor = p.getToDate().plusDays(1);
            }
        }
        java.time.LocalDate monthEnd = ym.atEndOfMonth();
        if (!cursor.isAfter(monthEnd)) {
            throw gapError(period, cursor, monthEnd);
        }
    }

    private BadRequestException gapError(ReportPeriod period, java.time.LocalDate from, java.time.LocalDate to) {
        String range = from.equals(to) ? ("ngày " + from) : ("từ " + from + " đến " + to);
        return new BadRequestException("Tháng " + period.getMonth() + "/" + period.getYear()
                + " đang HỞ " + range + " — chưa có Kỳ báo cáo nào phủ khoảng này, nên chuyến vận tải"
                + " rơi vào đó sẽ không bao giờ được tính bởi kỳ nào cả. Khai đủ Kỳ báo cáo cho"
                + " khoảng này rồi tính lại (không phải riêng kỳ đang chọn).");
    }

    // ── nhánh nhiên liệu ────────────────────────────────────────────────────

    /**
     * Nạp ba lưới của nhánh nhiên liệu.
     *
     * <p>Lưới chưa khai báo thì KHÔNG ném lỗi ngay tại đây — chỉ ghi vào
     * {@code warnings} — để một lượt chạy báo được ĐỦ mọi chỗ thiếu cùng lúc
     * (STD, ĐMNL, Năng suất xe, HS điều chỉnh…) thay vì dừng ở lỗi đầu tiên.
     * Nhưng {@code warnings} không còn "chỉ cảnh báo": {@link #calculatePeriod}
     * ném lỗi tổng hợp và KHÔNG lưu gì nếu list này còn phần tử sau khi tính
     * xong cả kỳ (QĐ-04/QĐ-06 — DE/EA là hai khoá được QĐ-06 nêu đích danh).
     */
    private Map<String, MatrixGridResponse> loadFuelGrids(java.time.LocalDate date, List<String> warnings) {
        Map<String, MatrixGridResponse> grids = new LinkedHashMap<>();
        for (String code : List.of("DMNL", "NANG_SUAT_XE", "HS_DIEU_CHINH_NLDM")) {
            try {
                // Tra theo NGÀY SẢN XUẤT, không phải phiên bản mới nhất: định
                // mức đổi theo tháng, chạy lại báo cáo cũ phải ra số cũ.
                grids.put(code, matrixService.getGridAt(code, date));
            } catch (RuntimeException e) {
                warnings.add("Chưa dùng được lưới " + code + " — nhánh nhiên liệu bỏ trống.");
            }
        }
        return grids;
    }

    private void applyFuel(ProductionResult result, TripBaseResult base,
                           Map<String, MatrixGridResponse> grids, FuelNormFactorSet factors, List<String> warnings) {
        if (grids.isEmpty()) return;
        FuelResult fuel = fuelCalculator.calculate(base.getTrip(), base, grids, factors);

        result.setFuelHb(fuel.getInterpDistanceLow());
        result.setFuelHa(fuel.getInterpDistanceHigh());
        result.setFuelH1(fuel.getInterpSlopeLow());
        result.setFuelH2(fuel.getInterpSlopeHigh());
        result.setFuelNbH1(fuel.getInterpNbH1());
        result.setFuelNbH2(fuel.getInterpNbH2());
        result.setFuelNb(fuel.getInterpNb());
        result.setFuelNaH1(fuel.getInterpNaH1());
        result.setFuelNaH2(fuel.getInterpNaH2());
        result.setFuelNa(fuel.getInterpNa());
        result.setFuelNt(fuel.getNormInterpolated());
        result.setBsnlRoda(fuel.getBsnlRoda());
        result.setBsnlRainyDay(fuel.getBsnlRainyDay());
        result.setBsnlSupplementary(fuel.getBsnlSupplementary());
        result.setBsnlMaintenance(fuel.getBsnlMaintenance());
        result.setBsnlOther(fuel.getBsnlOther());
        result.setBsnlSpnt(fuel.getBsnlSpnt());
        result.setBsnlMud(fuel.getBsnlMud());
        result.setFuelNormSeasonal(fuel.getNormSeasonal());
        result.setFuelNormVehicleClass(fuel.getNormVehicleClass());
        result.setFuelNormCarRenovation(fuel.getNormCarRenovation());
        result.setFuelCoalCnNkFactor(fuel.getCoalCnNkFactor());

        result.setFuelNorm(fuel.getNormFinal());
        result.setFuelBaseConsumption(fuel.getBaseConsumption());
        result.setFuelTotalBeforeAdjustment(fuel.getTotalBeforeAdjustment());
        result.setFuelCurrentNorm(fuel.getCurrentNorm());
        result.setProductivityNorm(fuel.getProductivityNorm());

        if (fuel.getWarnings() != null) warnings.addAll(fuel.getWarnings());
    }

    // ── rào chắn 1 ──────────────────────────────────────────────────────────

    private SurveyCoefficient buildApTdia(ReportPeriod period, GroupKey key,
                                          List<TripBaseResult> rows,
                                          List<String> warnings) {
        BigDecimal totalM3 = sum(rows, TripBaseResult::getTotalM3);
        BigDecimal totalTon = sum(rows, TripBaseResult::getTotalTon);
        BigDecimal totalTkm = sum(rows, TripBaseResult::getTotalTkm);

        SurveyCoefficient c = new SurveyCoefficient();
        c.setKind(SurveyCoefficient.Kind.AP_TDIA);
        c.setReportPeriod(period);
        c.setSeamGroupExcavatorKey(key.key());
        c.setAcceptanceProduct(key.product());
        c.setTotalM3(totalM3);
        c.setTotalTon(totalTon);
        c.setTotalTkm(totalTkm);
        c.setTripCount(rows.size());
        c.setGeneratedAt(LocalDateTime.now());

        Optional<SurveyStandard> std = findStandard(key, period);
        if (std.isEmpty()) {
            // Không có số trắc địa: docx dòng 253–255 nói "Tổng m3 = 0 > Đất
            // CN = 0 và HS = 0", nhưng QĐ-04 chốt rõ hơn — tra trượt tham số
            // định mức phải BÁO LỖI NGHIỆP VỤ, "tuyệt đối không âm thầm lấy
            // 0". Ghi vào `warnings`; `calculatePeriod` ném lỗi tổng hợp và
            // không lưu gì nếu list này còn phần tử sau khi tính xong cả kỳ.
            warnings.add("Chưa khai báo STD cho khoá \"" + key.key()
                    + "\" / " + key.product() + ".");
            c.setHsM3(BigDecimal.ZERO);
            c.setHsTon(BigDecimal.ZERO);
            c.setHsTkm(BigDecimal.ZERO);
            return c;
        }

        SurveyStandard s = std.get();
        boolean coalBlock = isCoalProduct(key.product());
        c.setSurveyM3(coalBlock ? s.getCoalM3() : s.getEarthM3());
        c.setSurveyTon(coalBlock ? s.getCoalTon() : s.getEarthTon());
        c.setSurveyTkm(coalBlock ? s.getCoalTkm() : s.getEarthTkm());

        c.setHsM3(ratio(c.getSurveyM3(), totalM3));
        c.setHsTon(ratio(c.getSurveyTon(), totalTon));
        c.setHsTkm(ratio(c.getSurveyTkm(), totalTkm));
        return c;
    }

    // ── lượt 2 ──────────────────────────────────────────────────────────────

    /** Kết quả trung gian của lượt 2, chưa lưu xuống CSDL. */
    private record Stage2(TripBaseResult base, BigDecimal ds, BigDecimal dw,
                          BigDecimal dx, BigDecimal bulkDensity) {}

    private Stage2 applyStage2(TripBaseResult r, SurveyCoefficient apTdia, List<String> warnings) {
        TransportReportTrip trip = r.getTrip();
        boolean ctnb = isCtnb(trip);

        // Nhánh CTNB dùng hệ số chênh lệch của chính chuyến, KHÔNG dùng hệ số
        // trắc địa — DS5 = IF(LEFT(J5,3)="TCN", AF5*AL5, AL5*S5).
        BigDecimal ctnbFactor = ctnbFactor(trip);
        BigDecimal hsM3 = nz(apTdia.getHsM3());

        BigDecimal ds = ctnb
                ? r.getTotalM3().multiply(ctnbFactor)
                : r.getTotalM3().multiply(hsM3);

        // Thể trọng (TĐ) chỉ còn là cột tham chiếu của báo cáo — không còn tham gia phép tính tấn.
        BigDecimal bulkDensity = resolveBulkDensity(r, warnings);

        // Chủ dự án chốt 2026-11-16: mỗi chuyến tính m3, tấn, tkm → cộng theo khoá (bảng Áp trắc địa)
        // → ba hệ số HSTĐ (m3, tấn, tkm) → áp NGƯỢC đúng hệ số tương ứng cho từng chuyến. Nhờ vậy
        // Thống kê sản lượng và Áp trắc địa là MỘT dữ liệu: tổng mỗi khoá khớp STD cả ba chỉ tiêu.
        // CTNB vẫn nhân hệ số chênh lệch riêng của chuyến (DW5 = IF(TCN, AM5*AF5, …)).
        BigDecimal dw = ctnb
                ? r.getTotalTon().multiply(ctnbFactor)
                : r.getTotalTon().multiply(nz(apTdia.getHsTon()));

        BigDecimal distance = trip.getTotalRouteDistanceKm() != null
                ? BigDecimal.valueOf(trip.getTotalRouteDistanceKm()) : BigDecimal.ZERO;
        BigDecimal dx = ctnb
                ? dw.multiply(distance)
                : r.getTotalTkm().multiply(nz(apTdia.getHsTkm()));

        return new Stage2(r,
                ds.setScale(VALUE_SCALE, RoundingMode.HALF_UP),
                dw.setScale(VALUE_SCALE, RoundingMode.HALF_UP),
                dx.setScale(VALUE_SCALE, RoundingMode.HALF_UP),
                bulkDensity);
    }

    /**
     * AC5 — Thể trọng (TĐ) dùng để quy m3 trắc địa sang tấn.
     *
     * <p>Docx dòng 269–273: sản phẩm {@code Dat_TCN}/{@code Than_CN} thì dùng
     * chính Tỷ trọng thường; {@code Dat_SX}/{@code Than_SX}/{@code Dat_CN}
     * thì lấy cột Thể trọng tương ứng trong danh mục STD; còn lại bằng 0.
     */
    private BigDecimal resolveBulkDensity(TripBaseResult r, List<String> warnings) {
        String product = r.getAcceptanceProduct();
        if (equalsAny(product, "Dat_TCN", "Than_CN")) {
            return r.getDensity();
        }
        if (!equalsAny(product, "Dat_SX", "Than_SX", "Dat_CN")) {
            // KHÔNG phải tra trượt — đây là quy tắc nghiệp vụ thật (docx dòng
            // 269–273): thể trọng chỉ có nghĩa với 4 sản phẩm liệt kê ở trên,
            // sản phẩm khác thì 0 là giá trị ĐÚNG, không phải thiếu khai báo.
            return BigDecimal.ZERO;
        }
        Optional<SurveyStandard> std = surveyStandardRepository.findEffective(
                standardTypeOf(product), r.getSeamGroupExcavatorKey(), r.getProductionDate());
        if (std.isEmpty()) {
            // Đây MỚI là tra trượt thật (QĐ-04) — trước 2026-09-07 hàm này
            // âm thầm trả 0 mà không hề báo, im lặng hơn cả hai chỗ kia cùng
            // tra STD trong file này. Phát hiện qua Quality Gate của Codex.
            warnings.add("Chưa khai báo STD (Thể trọng) cho khoá \""
                    + r.getSeamGroupExcavatorKey() + "\" / " + product + ".");
            return BigDecimal.ZERO;
        }

        SurveyStandard s = std.get();
        BigDecimal value = "Than_SX".equalsIgnoreCase(product)
                ? s.getCoalBulkDensity()
                : s.getEarthBulkDensity();
        return nz(value);
    }

    // ── dựng kết quả từng chuyến ───────────────────────────────────────────

    private ProductionResult buildResult(ReportPeriod period, Stage2 s, SurveyCoefficient apTdia, LocalDateTime now) {
        TripBaseResult r = s.base();

        ProductionResult out = new ProductionResult();
        out.setReportPeriod(period);
        out.setTransportTrip(r.getTrip());
        out.setProductionDate(r.getProductionDate());
        out.setSeamGroupExcavatorKey(r.getSeamGroupExcavatorKey());
        out.setAcceptanceProduct(r.getAcceptanceProduct());
        out.setDensityOriginal(r.getDensityOriginal());
        out.setDensityNoMoisture(r.getDensityNoMoisture());
        out.setTotalM3Original(r.getTotalM3Original());
        out.setTotalTonNoMoisture(r.getTotalTonNoMoisture());
        out.setTotalTkmNoMoisture(r.getTotalTkmNoMoisture());
        out.setTotalTonOriginalBeforeWaste(r.getTonOriginalBeforeWaste());
        out.setWasteRockTon(r.getWasteRockTon());
        out.setWasteRockM3(r.getWasteRockM3());
        out.setCargoCode(r.getCargoCode());
        out.setCargoTtlCode(r.getCargoTtlCode());
        out.setSeamKpmb(r.getSeamKpmb());

        out.setTotalM3(r.getTotalM3());
        out.setTotalTon(r.getTotalTon());
        out.setTotalTkm(r.getTotalTkm());

        out.setSurveyM3(s.ds());
        out.setSurveyTon(s.dw());
        out.setSurveyTkm(s.dx());

        out.setDensityUsed(r.getDensity());
        out.setModelUsed(r.getModel());
        out.setBulkDensityUsed(s.bulkDensity());
        // HSTĐ = số trắc địa ÷ tổng của khoá (cùng con số ở màn Áp Trắc địa); không còn hệ số lượt 3.
        out.setHsM3(nz(apTdia.getHsM3()));
        out.setHsTon(nz(apTdia.getHsTon()));
        out.setHsTkm(nz(apTdia.getHsTkm()));
        out.setCalculatedAt(now);
        return out;
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private record GroupKey(String key, String product) {}

    private Optional<SurveyStandard> findStandard(GroupKey key, ReportPeriod period) {
        SurveyStandard.CatalogType type = standardTypeOf(key.product());
        // Tra theo ngày ĐẦU kỳ: một kỳ nằm gọn trong một tháng (QĐ-05) nên
        // khoảng hiệu lực của STD không đổi giữa chừng trong kỳ.
        return surveyStandardRepository.findEffective(type, key.key(), period.getFromDate());
    }

    private static SurveyStandard.CatalogType standardTypeOf(String product) {
        return "Dat_CN".equalsIgnoreCase(product)
                ? SurveyStandard.CatalogType.DAT_CN
                : SurveyStandard.CatalogType.DAT_SX_THAN_SX;
    }

    private static boolean isCoalProduct(String product) {
        return product != null && product.toLowerCase().startsWith("than");
    }

    private static boolean isCtnb(TransportReportTrip trip) {
        CargoGroup group = trip.getCargoGroup();
        return group != null && group.getName() != null
                && group.getName().toUpperCase().startsWith(CTNB_PREFIX);
    }

    /** AF5 — HS áp cho than CTNB: bằng 1 khi hệ số chênh lệch bằng 0/trống. */
    static BigDecimal ctnbFactor(TransportReportTrip trip) {
        BigDecimal v = trip.getCtnbDeviationCoefficient();
        return (v == null || v.signum() == 0) ? BigDecimal.ONE : v;
    }

    /**
     * Hệ số = tử ÷ mẫu, mẫu bằng 0 (hoặc tử trống) thì bằng 0.
     *
     * <p>Trả 0 chứ không ném lỗi chia-cho-0: docx nói rõ tổng bằng 0 thì hệ
     * số bằng 0. Nhưng chỗ gọi có trách nhiệm cảnh báo khi thiếu STD.
     */
    private static BigDecimal ratio(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, HS_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal sum(List<TripBaseResult> rows,
                                  java.util.function.Function<TripBaseResult, BigDecimal> f) {
        return rows.stream().map(f).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static boolean equalsAny(String value, String... candidates) {
        if (value == null) return false;
        for (String c : candidates) {
            if (c.equalsIgnoreCase(value)) return true;
        }
        return false;
    }
}
