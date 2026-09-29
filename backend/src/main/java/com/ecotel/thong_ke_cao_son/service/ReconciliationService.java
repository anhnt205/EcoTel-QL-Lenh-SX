package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationDecisionRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationResubmitRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationSearchRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationTripUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationRowStatus;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationSide;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ForbiddenException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.security.AppUserDetails;
import com.ecotel.thong_ke_cao_son.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final TransportReportTripRepository transportReportTripRepository;
    private final ExcavationReportTripRepository excavationReportTripRepository;
    private final ReconciliationDecisionRepository reconciliationDecisionRepository;
    private final ReconciliationDataHistoryRepository reconciliationDataHistoryRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final UserRepository userRepository;
    private final TransportReportRepository transportReportRepository;
    private final ExcavationReportRepository excavationReportRepository;
    private final ReconciliationEventPublisher reconciliationEventPublisher;

    // ================= SEARCH (không đổi logic ghép cặp) =================

    public PageResponse<ReconciliationRowResponse> search(
            ReconciliationSearchRequest request, Pageable pageable) {

        List<TransportReportTrip> transportTrips = transportReportTripRepository.findForReconciliation(
                request.getFromDate(), request.getToDate(), request.getShiftIds(), request.getDeviceIds());

        List<ExcavationReportTrip> excavationTrips = excavationReportTripRepository.findForReconciliation(
                request.getFromDate(), request.getToDate(), request.getShiftIds(), request.getDeviceIds());

        // Lọc theo excavatorIds
        if (request.getExcavatorIds() != null && !request.getExcavatorIds().isEmpty()) {
            Set<Long> excavatorIdSet = new HashSet<>(request.getExcavatorIds());
            excavationTrips = excavationTrips.stream()
                    .filter(et -> excavatorIdSet.contains(et.getExcavationReport().getExcavatorDevice().getId()))
                    .collect(Collectors.toList());
        }

        // Nhóm CẢ HAI bên theo khoá ghép (Quality Gate lượt 5 của Codex —
        // lỗi thật: bản trước chỉ xử lý 1 CHIỀU (duyệt Vận tải, tìm ứng viên
        // Khai thác) — không kiểm tra chiều ngược lại. Khi 2 chuyến Vận tải
        // CÙNG khoá VÀ CÙNG nội dung cạnh tranh 1 chuyến Khai thác DUY NHẤT,
        // chuyến Vận tải xử lý trước (thứ tự lặp bất kỳ) vẫn ghép với chuyến
        // Khai thác đó và bị đánh dấu KHÔNG mơ hồ — sai, vì chuyến Vận tải
        // còn lại cũng khớp y hệt, không có căn cứ chọn chuyến nào. Xem
        // {@link #pairGroup} — xử lý CẢ nhóm cùng khoá 1 lần, đòi khớp DUY
        // NHẤT CẢ HAI CHIỀU (mutual-unique-match) mới coi là chắc chắn.
        Map<String, List<TransportReportTrip>> transportByKey = new LinkedHashMap<>();
        for (TransportReportTrip tt : transportTrips) {
            transportByKey.computeIfAbsent(buildTransportKey(tt), k -> new ArrayList<>()).add(tt);
        }
        Map<String, List<ExcavationReportTrip>> excavationByKey = new LinkedHashMap<>();
        for (ExcavationReportTrip et : excavationTrips) {
            excavationByKey.computeIfAbsent(buildExcavationKey(et), k -> new ArrayList<>()).add(et);
        }

        // Batch tra decision + cờ "có lịch sử" MỘT LẦN cho cả trang — tránh N+1
        // (trước đây buildRow tự query riêng cho từng dòng).
        List<Long> transportTripIds = transportTrips.stream().map(TransportReportTrip::getId).toList();
        List<Long> excavationTripIds = excavationTrips.stream().map(ExcavationReportTrip::getId).toList();

        Map<Long, ReconciliationDecision> decisionByTransportTripId =
                reconciliationDecisionRepository.findByTransportReportTrip_IdIn(transportTripIds).stream()
                        .collect(Collectors.toMap(d -> d.getTransportReportTrip().getId(), d -> d));
        Map<Long, ReconciliationDecision> decisionByExcavationTripId =
                reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(excavationTripIds).stream()
                        .collect(Collectors.toMap(d -> d.getExcavationReportTrip().getId(), d -> d));

        Set<Long> transportIdsWithHistory = new HashSet<>(
                reconciliationDataHistoryRepository.findDistinctTripIdBySideAndTripIdIn(
                        ReconciliationSide.TRANSPORT, transportTripIds));
        Set<Long> excavationIdsWithHistory = new HashSet<>(
                reconciliationDataHistoryRepository.findDistinctTripIdBySideAndTripIdIn(
                        ReconciliationSide.EXCAVATION, excavationTripIds));

        List<ReconciliationRowResponse> rows = new ArrayList<>();

        Set<String> allKeys = new LinkedHashSet<>();
        allKeys.addAll(transportByKey.keySet());
        allKeys.addAll(excavationByKey.keySet());

        for (String key : allKeys) {
            List<TransportReportTrip> tGroup = transportByKey.getOrDefault(key, List.of());
            List<ExcavationReportTrip> eGroup = excavationByKey.getOrDefault(key, List.of());
            for (PairResult pair : pairGroup(tGroup, eGroup)) {
                if (!canSeeRow(pair.transport(), pair.excavation())) {
                    continue;
                }
                rows.add(buildRow(pair.transport(), pair.excavation(), pair.ambiguous(),
                        decisionByTransportTripId, decisionByExcavationTripId,
                        transportIdsWithHistory, excavationIdsWithHistory));
            }
        }

        // Lọc theo trạng thái duyệt của chuyến (status trên trip) — đọc thẳng từ
        // row đã dựng (buildRow đã gán transportStatus/excavationStatus), không
        // tự query lại từng dòng như trước.
        //
        // Riêng lọc APPROVED (dùng bởi "Báo chuyến" — StandardTripReportPage,
        // nơi DUY NHẤT gọi tham số này): chốt 2026-09-09, phải đòi CẢ HAI bên
        // cùng APPROVED khi dòng có đủ cả 2 bên. Trước đây dùng OR — chỉ cần 1
        // bên duyệt là đủ hiện dòng, dẫn tới lỗ hổng có thật đã tái hiện được:
        // duyệt lệch 1 bên (qua đường "Yêu cầu chỉnh sửa" chỉ nhắm 1 bên, hoặc
        // gọi API trực tiếp) khiến dòng hiện "Đã duyệt" ở Báo chuyến dù bên kia
        // CHƯA TỪNG được ai duyệt — sai đúng nguyên tắc QĐ-16 "chỉ dữ liệu đã
        // duyệt đối chiếu mới được coi là chuẩn". Dòng chỉ có 1 bên (chưa ghép
        // cặp — bên kia null) thì vẫn chỉ cần đúng bên đó APPROVED, không đòi
        // ghép cặp giả. Các trạng thái lọc khác (PENDING, REVISION_REQUESTED)
        // giữ nguyên OR — "còn ít nhất 1 bên ở trạng thái đó" vẫn đúng ý nghĩa.
        if (request.getStatus() != null) {
            ApprovalStatus filterStatus = request.getStatus();
            rows = rows.stream().filter(row -> {
                boolean transportMatch = row.getTransportStatus() == filterStatus;
                boolean excavationMatch = row.getExcavationStatus() == filterStatus;
                if (filterStatus == ApprovalStatus.APPROVED
                        && row.getTransportStatus() != null && row.getExcavationStatus() != null) {
                    return transportMatch && excavationMatch;
                }
                return transportMatch || excavationMatch;
            }).collect(Collectors.toList());
        }

        rows.sort(Comparator
                .comparing(ReconciliationRowResponse::getReportDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ReconciliationRowResponse::getShiftName, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ReconciliationRowResponse::getVehicleCode, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ReconciliationRowResponse::getExcavatorName, Comparator.nullsLast(Comparator.naturalOrder())));

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), rows.size());
        List<ReconciliationRowResponse> paginatedContent = start < rows.size()
                ? rows.subList(start, end)
                : List.of();

        Page<ReconciliationRowResponse> page = new PageImpl<>(paginatedContent, pageable, rows.size());
        return PageResponse.from(page);
    }

    /**
     * Khoá ghép cặp một chuyến Vận tải với một chuyến Khai thác — CHỈ theo
     * (Thời gian, Ca, Máy xúc, Số xe), đúng yêu cầu nghiệp vụ (chủ dự án
     * chốt 2026-09-08): đây là bốn thứ PHẢI giống nhau để coi là "cùng một
     * chuyến xe" được ghi hai lần ở hai phân xưởng khác nhau.
     *
     * <p><b>KHÔNG được đưa {@code cargoType} (Loại hàng) vào khoá này</b> —
     * trước đây có, và đó chính là lỗi: Loại hàng là một trong những thứ
     * đối chiếu PHẢI SO SÁNH xem hai bên có ghi lệch nhau không (cùng với
     * Số chuyến, Tải trọng, Số thẻ lương — xem {@link #isMatched}), không
     * phải điều kiện để được phép ghép cặp. Đưa vào khoá khiến hai chuyến
     * chỉ lệch đúng Loại hàng (ví dụ Vận tải ghi "Bùn nhão", Khai thác ghi
     * "Bùn dượt" cho CÙNG MỘT xe/máy xúc/ca) không bao giờ ghép được — mỗi
     * bên rơi vào MỘT DÒNG RIÊNG, làm mất hẳn mục đích đối chiếu (không
     * còn gì để so sánh trên cùng một dòng). Phát hiện qua ảnh chụp thật
     * của chủ dự án: Ca 2, xe 468, Máy xúc P17 bị tách thành 2 dòng vì
     * Vận tải ghi "Bùn nhão" (6 chuyến) còn Khai thác ghi "Bùn dượt" (12
     * chuyến) — đúng loại lệch mà đối chiếu phải BẮT ĐƯỢC, không phải né.
     */
    private String buildTransportKey(TransportReportTrip tt) {
        TransportReport header = tt.getTransportReport();
        return header.getReportDate() + "_" + header.getShift().getId() + "_"
                + header.getVehicle().getId() + "_" + tt.getExcavator().getId();
    }

    /** Xem javadoc {@link #buildTransportKey} — cùng bốn thành phần, cùng thứ tự. */
    private String buildExcavationKey(ExcavationReportTrip et) {
        ExcavationReport header = et.getExcavationReport();
        return header.getReportDate() + "_" + header.getShift().getId() + "_"
                + et.getVehicle().getId() + "_" + header.getExcavatorDevice().getId();
    }

    /** Kết quả ghép 1 CẶP (hoặc 1 chuyến không ghép được, phía còn lại null) trong cùng 1 khoá — xem {@link #pairGroup}. */
    private record PairResult(TransportReportTrip transport, ExcavationReportTrip excavation, boolean ambiguous) {}

    /**
     * Ghép TOÀN BỘ 1 nhóm cùng khoá (Thời gian/Ca/Máy xúc/Số xe) —
     * {@code tGroup}/{@code eGroup} đúng các chuyến Vận tải/Khai thác chia
     * sẻ khoá đó.
     *
     * <p><b>Lịch sử:</b> lượt 3 thêm {@code ORDER BY} để ghép XÁC ĐỊNH.
     * Lượt 4 sửa lỗi dừng ở ứng viên khớp {@link #isMatched} ĐẦU TIÊN thay
     * vì đếm hết — nhưng vẫn chỉ xử lý 1 CHIỀU (duyệt từng chuyến Vận tải,
     * tìm ứng viên Khai thác). <b>Lỗi thật còn lại (Quality Gate lượt 5 của
     * Codex):</b> khi 2+ chuyến Vận tải CÙNG khoá VÀ CÙNG nội dung cạnh
     * tranh 1 chuyến Khai thác DUY NHẤT, chuyến Vận tải xử lý trước (thứ tự
     * lặp — không có ý nghĩa nghiệp vụ) vẫn được ghép với chuyến Khai thác
     * đó và đánh dấu {@code ambiguous=false} — SAI, vì chuyến Vận tải còn
     * lại cũng khớp y hệt, không có căn cứ chọn chuyến nào là "đúng".
     *
     * <p><b>Sửa — khớp DUY NHẤT CẢ HAI CHIỀU (mutual-unique-match):</b> 1
     * cặp {@code (t, e)} chỉ CHẮC CHẮN khi {@code e} là ứng viên DUY NHẤT
     * khớp {@link #isMatched} của {@code t} TRONG SỐ những ứng viên CÒN LẠI
     * (chưa ghép), VÀ {@code t} cũng là ứng viên DUY NHẤT khớp của
     * {@code e} — không chỉ kiểm tra 1 chiều như trước. Xử lý theo 2 vòng:
     * <ol>
     *   <li>Vòng 1 — ghép hết mọi cặp thoả mutual-unique-match tìm được (áp
     *       dụng lặp lại trên phần CÒN LẠI sau mỗi lần ghép, vì loại bỏ 1
     *       cặp chắc chắn có thể làm lộ ra cặp chắc chắn khác).</li>
     *   <li>Vòng 2 — phần còn lại (không xác định được bằng nội dung, tự nó
     *       đang lệch số liệu hoặc vẫn cạnh tranh nhau) ghép TẠM theo thứ
     *       tự ổn định (đầu vào đã {@code ORDER BY} ở repository), đánh dấu
     *       {@code ambiguous=true} — không thể để trống dòng (vẫn phải hiện
     *       đủ để đối chiếu) nhưng phải phân biệt rõ với ghép chắc chắn.</li>
     * </ol>
     * Nhóm chỉ có tối đa 1 chuyến mỗi bên (không cạnh tranh phía nào) luôn
     * {@code ambiguous=false} dù nội dung khớp hay không — đó là "lệch số
     * liệu" bình thường của đối chiếu, không phải vấn đề PAIRING.
     */
    private List<PairResult> pairGroup(List<TransportReportTrip> tGroup, List<ExcavationReportTrip> eGroup) {
        List<PairResult> results = new ArrayList<>();
        if (tGroup.size() <= 1 && eGroup.size() <= 1) {
            if (!tGroup.isEmpty() && !eGroup.isEmpty()) {
                results.add(new PairResult(tGroup.get(0), eGroup.get(0), false));
            } else if (!tGroup.isEmpty()) {
                results.add(new PairResult(tGroup.get(0), null, false));
            } else if (!eGroup.isEmpty()) {
                results.add(new PairResult(null, eGroup.get(0), false));
            }
            return results;
        }

        List<TransportReportTrip> remainingT = new ArrayList<>(tGroup);
        List<ExcavationReportTrip> remainingE = new ArrayList<>(eGroup);

        // Vòng 1: lặp lại tới khi không còn ghép được cặp mutual-unique nào
        // nữa — loại 1 cặp chắc chắn có thể làm 1 cặp khác (trước đó bị
        // "vướng" vì ứng viên của nó còn bị cạnh tranh) trở nên duy nhất.
        boolean foundInPass;
        do {
            foundInPass = false;
            for (int i = 0; i < remainingT.size(); i++) {
                TransportReportTrip tt = remainingT.get(i);
                List<ExcavationReportTrip> tMatches = remainingE.stream().filter(e -> isMatched(tt, e)).toList();
                if (tMatches.size() != 1) {
                    continue;
                }
                ExcavationReportTrip candidate = tMatches.get(0);
                long candidateMatchCount = remainingT.stream().filter(t -> isMatched(t, candidate)).count();
                if (candidateMatchCount == 1) {
                    results.add(new PairResult(tt, candidate, false));
                    remainingT.remove(i);
                    remainingE.remove(candidate);
                    foundInPass = true;
                    break; // remainingT vừa đổi chỉ số -> bắt đầu lại vòng for
                }
            }
        } while (foundInPass);

        // Vòng 2: phần còn lại — không đủ căn cứ nội dung để phân biệt.
        int n = Math.min(remainingT.size(), remainingE.size());
        for (int i = 0; i < n; i++) {
            results.add(new PairResult(remainingT.get(i), remainingE.get(i), true));
        }
        for (int i = n; i < remainingT.size(); i++) {
            results.add(new PairResult(remainingT.get(i), null, false));
        }
        for (int i = n; i < remainingE.size(); i++) {
            results.add(new PairResult(null, remainingE.get(i), false));
        }
        return results;
    }

    /**
     * Phân quyền DỮ LIỆU theo đơn vị (Quality Gate lượt 2, 2026-09-10) — xem
     * javadoc tương ứng ở TransportReportService/ExcavationReportService.
     * Đối chiếu ghép cặp CẢ HAI bên nên dùng OR: đơn vị Vận tải/Khai thác vẫn
     * cần thấy bên KIA của dòng mình để so sánh — chỉ ẨN dòng khi KHÔNG bên
     * nào (trong số các bên THỰC SỰ tồn tại ở dòng đó) thuộc đơn vị mình.
     */
    private boolean canSeeRow(TransportReportTrip tt, ExcavationReportTrip et) {
        AppUserDetails user = SecurityUtils.currentUser();
        if (user == null || user.hasFullDataScope()) {
            return true;
        }
        boolean transportOk = tt != null && user.canAccessDepartment(
                tt.getTransportReport().getVehicle().getDepartment() != null
                        ? tt.getTransportReport().getVehicle().getDepartment().getId() : null);
        boolean excavationOk = et != null && user.canAccessDepartment(
                et.getExcavationReport().getExcavatorDevice().getDepartment() != null
                        ? et.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null);
        return transportOk || excavationOk;
    }

    private void assertTransportTripAccess(TransportReportTrip trip) {
        AppUserDetails user = SecurityUtils.currentUser();
        Long deptId = trip.getTransportReport().getVehicle().getDepartment() != null
                ? trip.getTransportReport().getVehicle().getDepartment().getId() : null;
        if (user == null || !user.canAccessDepartment(deptId)) {
            throw new ForbiddenException("Không có quyền truy cập dữ liệu Vận tải của đơn vị khác");
        }
    }

    private void assertExcavationTripAccess(ExcavationReportTrip trip) {
        AppUserDetails user = SecurityUtils.currentUser();
        Long deptId = trip.getExcavationReport().getExcavatorDevice().getDepartment() != null
                ? trip.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null;
        if (user == null || !user.canAccessDepartment(deptId)) {
            throw new ForbiddenException("Không có quyền truy cập dữ liệu Khai thác của đơn vị khác");
        }
    }

    private ReconciliationRowResponse buildRow(
            TransportReportTrip tt, ExcavationReportTrip et, boolean pairingAmbiguous,
            Map<Long, ReconciliationDecision> decisionByTransportTripId,
            Map<Long, ReconciliationDecision> decisionByExcavationTripId,
            Set<Long> transportIdsWithHistory, Set<Long> excavationIdsWithHistory) {
        var builder = ReconciliationRowResponse.builder().pairingAmbiguous(pairingAmbiguous);

        ApprovalStatus transportStatus = tt != null ? tt.getStatus() : null;
        ApprovalStatus excavationStatus = et != null ? et.getStatus() : null;

        if (tt != null) {
            TransportReport header = tt.getTransportReport();
            builder.transportReportTripId(tt.getId())
                    .reportDate(header.getReportDate())
                    .shiftName(header.getShift().getName())
                    .vehicleCode(header.getVehicle().getCode())
                    .excavationAreaName(tt.getExcavationArea().getName())
                    .excavatorName(tt.getExcavator().getName())
                    .loadingPointName(tt.getLoadingPoint().getName())
                    .unloadingFloor(tt.getUnloadingFloor())
                    .receivingFloor(tt.getReceivingFloor())
                    .totalRouteDistanceKm(tt.getTotalRouteDistanceKm())
                    .totalRouteLiftM(tt.getTotalRouteLiftM())
                    .localSlopeDistanceKm(tt.getLocalSlopeDistanceKm())
                    .localSlopeM(tt.getLocalSlopeM())
                    .unloadingPointName(tt.getUnloadingPoint().getName())
                    .rainyDay(tt.getRainyDay())
                    .supplementaryVehicle(tt.getSupplementaryVehicle());
            // Đang chờ Vận tải sửa lại -> ẨN dữ liệu ở bảng (KHÔNG đụng CSDL thật,
            // xem lịch sử qua icon "i" — dữ liệu snapshot lúc yêu cầu sửa).
            if (transportStatus != ApprovalStatus.REVISION_REQUESTED) {
                builder.transportData(ReconciliationTripDataResponse.builder()
                        .cargoTypeName(tt.getCargoType().getName())
                        .tripCount(tt.getTripCount())
                        .loadLevelType(tt.getLoadLevel().getType())
                        .loadLevelCustomValue(tt.getLoadLevel().getCustomValue())
                        .employeeSalaryCode(header.getEmployee().getSalaryCode())
                        .employeeFullName(header.getEmployee().getFullName())
                        .build());
            }
            builder.transportHistoryAvailable(transportIdsWithHistory.contains(tt.getId()));
        } else {
            ExcavationReport header = et.getExcavationReport();
            builder.reportDate(header.getReportDate())
                    .shiftName(header.getShift().getName())
                    .vehicleCode(et.getVehicle().getCode())
                    .excavatorName(header.getExcavatorDevice().getName());
        }

        if (et != null) {
            ExcavationReport header = et.getExcavationReport();
            builder.excavationReportTripId(et.getId());
            if (excavationStatus != ApprovalStatus.REVISION_REQUESTED) {
                builder.excavationData(ReconciliationTripDataResponse.builder()
                        .cargoTypeName(et.getCargoType().getName())
                        .tripCount(et.getTripCount())
                        .loadLevelType(et.getLoadLevel().getType())
                        .loadLevelCustomValue(et.getLoadLevel().getCustomValue())
                        .employeeSalaryCode(header.getEmployee().getSalaryCode())
                        .employeeFullName(header.getEmployee().getFullName())
                        .build());
            }
            builder.excavationHistoryAvailable(excavationIdsWithHistory.contains(et.getId()));
        }

        builder.matched(isMatched(tt, et));
        builder.transportStatus(transportStatus);
        builder.excavationStatus(excavationStatus);

        ReconciliationDecision decision = null;
        if (tt != null) {
            decision = decisionByTransportTripId.get(tt.getId());
        }
        if (decision == null && et != null) {
            decision = decisionByExcavationTripId.get(et.getId());
        }
        if (decision != null) {
            builder.decision(toDecisionResponse(decision));
        }

        builder.status(computeRowStatus(transportStatus, excavationStatus,
                decision != null ? decision.getStatus() : null));

        return builder.build();
    }

    /**
     * Đỏ nhạt = còn ít nhất 1 bên đang chờ sửa. Vàng nhạt = cả 2 bên đã hết
     * chờ sửa NHƯNG decision vẫn còn REVISION_REQUESTED (đang giữa chu kỳ,
     * chờ thống kê viên duyệt lại — xem {@link #syncTripStatusToPending}).
     * Trắng = đã duyệt, hoặc chưa từng có vấn đề gì.
     */
    private ReconciliationRowStatus computeRowStatus(
            ApprovalStatus transportStatus, ApprovalStatus excavationStatus, ApprovalStatus decisionStatus) {
        if (transportStatus == ApprovalStatus.REVISION_REQUESTED
                || excavationStatus == ApprovalStatus.REVISION_REQUESTED) {
            return ReconciliationRowStatus.REVISION_REQUESTED;
        }
        if (decisionStatus == ApprovalStatus.REVISION_REQUESTED) {
            return ReconciliationRowStatus.AWAITING_REAPPROVAL;
        }
        if (decisionStatus == ApprovalStatus.APPROVED) {
            return ReconciliationRowStatus.APPROVED;
        }
        return ReconciliationRowStatus.PENDING;
    }

    /**
     * "Khớp số liệu" — bốn thứ Vận tải và Khai thác PHẢI ghi giống nhau cho
     * cùng một chuyến xe (đã ghép cặp theo Thời gian/Ca/Máy xúc/Số xe ở
     * {@link #buildTransportKey}): Số chuyến, Loại hàng, Tải trọng, và
     * NHÂN VIÊN (Số thẻ lương / Người nhập chuyến — cùng một trường
     * {@code Report.employee}, nên so một lần là đủ cho cả hai cột hiển
     * thị). Thiếu so nhân viên là lỗ hổng thật: hai bên ghi khác tài xế/
     * người vận hành cho cùng chuyến vẫn báo "khớp" nếu ba thứ kia trùng.
     */
    private boolean isMatched(TransportReportTrip tt, ExcavationReportTrip et) {
        if (tt == null || et == null) {
            return false;
        }
        boolean cargoTypeSame = tt.getCargoType().getId().equals(et.getCargoType().getId());
        boolean tripCountSame = Objects.equals(tt.getTripCount(), et.getTripCount());
        boolean loadLevelSame = tt.getLoadLevel().getType() == et.getLoadLevel().getType()
                && Objects.equals(tt.getLoadLevel().getCustomValue(), et.getLoadLevel().getCustomValue());
        boolean employeeSame = Objects.equals(
                tt.getTransportReport().getEmployee().getId(),
                et.getExcavationReport().getEmployee().getId());
        return cargoTypeSame && tripCountSame && loadLevelSame && employeeSame;
    }

    private ReconciliationDecisionResponse toDecisionResponse(ReconciliationDecision decision) {
        return ReconciliationDecisionResponse.builder()
                .status(decision.getStatus())
                .note(decision.getNote())
                .build();
    }

    // ================= DUYỆT (đổi trạng thái + ghi chú, KHÔNG đổi dữ liệu báo cáo) =================

    @Transactional
    public ReconciliationDecisionResponse saveDecision(ReconciliationDecisionRequest request) {
        return saveDecisions(List.of(request)).get(0);
    }

    @Transactional
    public List<ReconciliationDecisionResponse> saveDecisions(List<ReconciliationDecisionRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }

        List<Long> transportTripIds = requests.stream()
                .map(ReconciliationDecisionRequest::getTransportReportTripId)
                .filter(Objects::nonNull).distinct().toList();

        List<Long> excavationTripIds = requests.stream()
                .map(ReconciliationDecisionRequest::getExcavationReportTripId)
                .filter(Objects::nonNull).distinct().toList();

        Map<Long, TransportReportTrip> transportTripById = transportReportTripRepository.findAllById(transportTripIds)
                .stream().collect(Collectors.toMap(TransportReportTrip::getId, t -> t));

        Map<Long, ExcavationReportTrip> excavationTripById = excavationReportTripRepository.findAllById(excavationTripIds)
                .stream().collect(Collectors.toMap(ExcavationReportTrip::getId, t -> t));

        Map<Long, ReconciliationDecision> existingByTransportTripId =
                reconciliationDecisionRepository.findByTransportReportTrip_IdIn(transportTripIds).stream()
                        .collect(Collectors.toMap(d -> d.getTransportReportTrip().getId(), d -> d));

        Map<Long, ReconciliationDecision> existingByExcavationTripId =
                reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(excavationTripIds).stream()
                        .collect(Collectors.toMap(d -> d.getExcavationReportTrip().getId(), d -> d));

        List<ReconciliationDecision> toSave = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            ReconciliationDecisionRequest request = requests.get(i);
            try {
                toSave.add(buildDecision(request, transportTripById, excavationTripById,
                        existingByTransportTripId, existingByExcavationTripId));
            } catch (Exception e) {
                errors.add("Mục thứ " + (i + 1) + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            throw new BadRequestException(String.join("; ", errors));
        }

        List<ReconciliationDecision> saved = reconciliationDecisionRepository.saveAll(toSave);

        // Sync trip status — CHỈ bên request THỰC SỰ nhắm tới (request.getXxxTripId(),
        // KHÔNG phải decision.getXxx() sau merge). Lý do: buildDecision (đúng) không
        // null hoá FK cũ khi request chỉ gửi 1 bên (không được xoá liên kết ghép cặp),
        // nên 1 decision từng gắn cả 2 bên (vd sau khi duyệt chung) vẫn còn nguyên cả 2
        // FK dù yêu cầu sửa lần này chỉ nhắm 1 bên — đọc decision.getXxx() ở đây sẽ đổi
        // NHẦM trạng thái sang cả bên không được nhắm tới. Bug thật, chặn đúng luồng
        // "ẩn dữ liệu + đỏ/vàng theo từng bên" (chốt 2026-09-08).
        // `toSave` tương ứng 1:1 theo index với `requests` (chỉ append khi build không
        // lỗi, và hàm đã throw sớm ở trên nếu có lỗi).
        List<ReconciliationDataHistory> historyToSave = new ArrayList<>();
        // Ngày báo cáo của các chuyến VỪA được duyệt (APPROVED) trong lần gọi
        // này — dùng để tự động tính lại báo cáo sản lượng của (các) kỳ chứa
        // những ngày đó, xem ReconciliationEventPublisher.publishApproved.
        // Chỉ ngày, không phải mọi ngày bị đụng tới (yêu cầu sửa/gửi lại
        // không cần kích hoạt tính lại — dữ liệu chưa "sạch" để tính).
        Set<LocalDate> approvedReportDates = new LinkedHashSet<>();
        for (int i = 0; i < requests.size(); i++) {
            ReconciliationDecisionRequest request = requests.get(i);
            ReconciliationDecision decision = toSave.get(i);
            ApprovalStatus newStatus = decision.getStatus();

            if (request.getTransportReportTripId() != null) {
                TransportReportTrip trip = transportTripById.get(request.getTransportReportTripId());
                if (newStatus == ApprovalStatus.REVISION_REQUESTED
                        && trip.getStatus() != ApprovalStatus.REVISION_REQUESTED) {
                    historyToSave.add(snapshotTransport(decision, trip, request.getNote()));
                }
                trip.setStatus(newStatus);
                transportReportTripRepository.save(trip);
                if (newStatus == ApprovalStatus.APPROVED) {
                    approvedReportDates.add(trip.getTransportReport().getReportDate());
                }
            }
            if (request.getExcavationReportTripId() != null) {
                ExcavationReportTrip trip = excavationTripById.get(request.getExcavationReportTripId());
                if (newStatus == ApprovalStatus.REVISION_REQUESTED
                        && trip.getStatus() != ApprovalStatus.REVISION_REQUESTED) {
                    historyToSave.add(snapshotExcavation(decision, trip, request.getNote()));
                }
                trip.setStatus(newStatus);
                excavationReportTripRepository.save(trip);
                if (newStatus == ApprovalStatus.APPROVED) {
                    approvedReportDates.add(trip.getExcavationReport().getReportDate());
                }
            }
        }
        if (!historyToSave.isEmpty()) {
            reconciliationDataHistoryRepository.saveAll(historyToSave);
        }

        reconciliationEventPublisher.publishChanged();
        reconciliationEventPublisher.publishApproved(approvedReportDates);
        return saved.stream().map(this::toDecisionResponse).toList();
    }

    private ReconciliationDataHistory snapshotTransport(
            ReconciliationDecision decision, TransportReportTrip trip, String note) {
        ReconciliationDataHistory h = new ReconciliationDataHistory();
        h.setReconciliationDecision(decision);
        h.setSide(ReconciliationSide.TRANSPORT);
        h.setTripId(trip.getId());
        h.setCargoTypeName(trip.getCargoType().getName());
        h.setTripCount(trip.getTripCount());
        h.setLoadLevelType(trip.getLoadLevel().getType());
        h.setLoadLevelCustomValue(trip.getLoadLevel().getCustomValue());
        h.setEmployeeSalaryCode(trip.getTransportReport().getEmployee().getSalaryCode());
        h.setEmployeeFullName(trip.getTransportReport().getEmployee().getFullName());
        h.setNote(note);
        return h;
    }

    private ReconciliationDataHistory snapshotExcavation(
            ReconciliationDecision decision, ExcavationReportTrip trip, String note) {
        ReconciliationDataHistory h = new ReconciliationDataHistory();
        h.setReconciliationDecision(decision);
        h.setSide(ReconciliationSide.EXCAVATION);
        h.setTripId(trip.getId());
        h.setCargoTypeName(trip.getCargoType().getName());
        h.setTripCount(trip.getTripCount());
        h.setLoadLevelType(trip.getLoadLevel().getType());
        h.setLoadLevelCustomValue(trip.getLoadLevel().getCustomValue());
        h.setEmployeeSalaryCode(trip.getExcavationReport().getEmployee().getSalaryCode());
        h.setEmployeeFullName(trip.getExcavationReport().getEmployee().getFullName());
        h.setNote(note);
        return h;
    }

    private ReconciliationDecision buildDecision(
            ReconciliationDecisionRequest request,
            Map<Long, TransportReportTrip> transportTripById,
            Map<Long, ExcavationReportTrip> excavationTripById,
            Map<Long, ReconciliationDecision> existingByTransportTripId,
            Map<Long, ReconciliationDecision> existingByExcavationTripId) {

        if (request.getTransportReportTripId() == null && request.getExcavationReportTripId() == null) {
            throw new BadRequestException("Cần ít nhất 1 trong 2: chuyến Vận tải hoặc chuyến Khai thác");
        }

        ReconciliationDecision decision = null;
        if (request.getTransportReportTripId() != null) {
            decision = existingByTransportTripId.get(request.getTransportReportTripId());
        }
        if (decision == null && request.getExcavationReportTripId() != null) {
            decision = existingByExcavationTripId.get(request.getExcavationReportTripId());
        }
        if (decision == null) {
            decision = new ReconciliationDecision();
        }

        // Xác minh phạm vi đơn vị TRƯỚC khi gán vào decision (Quality Gate
        // lượt 3 của Codex, 2026-09-10): trước đây saveDecisions() hoàn toàn
        // không kiểm tra — tài khoản scoped nhưng có quyền CHỨC NĂNG duyệt
        // ("reconciliation:a") gửi thẳng trip id của đơn vị khác vẫn duyệt/
        // yêu cầu sửa được. Ném ở ĐÂY (trong buildDecision, được gọi trong
        // try/catch của vòng lặp saveDecisions) để lỗi được gom vào cùng cơ
        // chế "1 phần tử bulk sai -> gom lỗi -> KHÔNG lưu gì hết" đã có sẵn
        // (toSave chỉ được saveAll SAU KHI toàn bộ vòng lặp không lỗi) —
        // đúng yêu cầu rollback toàn transaction khi bulk có phần tử sai.
        TransportReportTrip transportTrip = null;
        ExcavationReportTrip excavationTrip = null;

        if (request.getTransportReportTripId() != null) {
            transportTrip = transportTripById.get(request.getTransportReportTripId());
            if (transportTrip == null) {
                throw new ResourceNotFoundException("Không tìm thấy chuyến Vận tải: " + request.getTransportReportTripId());
            }
            assertTransportTripAccess(transportTrip);
            decision.setTransportReportTrip(transportTrip);
        }
        if (request.getExcavationReportTripId() != null) {
            excavationTrip = excavationTripById.get(request.getExcavationReportTripId());
            if (excavationTrip == null) {
                throw new ResourceNotFoundException("Không tìm thấy chuyến Khai thác: " + request.getExcavationReportTripId());
            }
            assertExcavationTripAccess(excavationTrip);
            decision.setExcavationReportTrip(excavationTrip);
        }

        // APPROVED một phía là không hợp lệ (Quality Gate lượt 7 của Codex,
        // 2026-09-16) — lỗ hổng thật: request chỉ gửi transportReportTripId
        // (không kèm excavationReportTripId) vẫn duyệt được TransportReportTrip
        // RIÊNG LẺ, không hề xác minh chuyến Khai thác ghép cặp có tồn tại hay
        // đã khớp hay chưa. ProductionCalculationService trước đây CHỈ đọc
        // TransportReportTrip.status == APPROVED để đưa vào tính sản lượng —
        // đưa lọt được 1 chuyến chưa đối chiếu đầy đủ vào báo cáo, trái yêu
        // cầu nghiệp vụ "cả hai bên cùng duyệt". APPROVED bắt buộc phải là
        // quyết định cho CẢ MỘT CẶP xác định (đủ 2 id, rồi đi qua assertValidPair
        // ngay dưới đây — cùng khoá, khớp nội dung, mutual-unique). Yêu cầu
        // sửa (REVISION_REQUESTED) thì NGƯỢC LẠI vẫn PHẢI cho phép gửi 1 phía
        // — đúng luồng nghiệp vụ "đỏ/vàng/trắng" đã có (yêu cầu bên nào sửa
        // thì chỉ nhắm đúng bên đó, xem updateTrips/resubmitTrips).
        if (request.getStatus() == ApprovalStatus.APPROVED && (transportTrip == null || excavationTrip == null)) {
            throw new BadRequestException(
                    "Không thể duyệt (APPROVED) một phía — cần gửi ĐỦ CẢ HAI id (Vận tải và Khai thác) của "
                            + "một cặp xác định. Muốn yêu cầu sửa riêng 1 bên, dùng trạng thái REVISION_REQUESTED.");
        }

        // Từ chối duyệt/yêu cầu sửa một CẶP không xác định rõ ràng (Quality
        // Gate lượt 4 của Codex, 2026-09-15) — trước đây `pairingAmbiguous`
        // chỉ có ở response cho FE hiển thị, backend vẫn chấp nhận duyệt bất
        // kỳ cặp id nào gửi lên dù pairing đó không có căn cứ (ví dụ FE bị
        // qua mặt, hoặc gọi API trực tiếp). CHỈ áp dụng khi request gửi CẢ
        // HAI id (đang thao tác trên 1 CẶP) — request chỉ 1 phía không giả
        // định gì về pairing nên không cần kiểm tra này.
        if (transportTrip != null && excavationTrip != null) {
            assertValidPair(transportTrip, excavationTrip, request.getStatus());
        }

        decision.setStatus(request.getStatus());
        decision.setNote(request.getNote());

        return decision;
    }

    /**
     * Xác minh cặp {@code (tt, et)} gửi lên trong 1 {@code ReconciliationDecisionRequest}
     * là 1 cặp HỢP LỆ để thao tác — gộp 3 điều kiện độc lập, đều là lỗ hổng
     * thật được Codex tìm ra qua các lượt Quality Gate liên tiếp:
     *
     * <ol>
     *   <li><b>CÙNG khoá ghép</b> (Thời gian/Ca/Máy xúc/Số xe) — kiểm tra
     *       NGAY ĐẦU, trước mọi truy vấn khác. <b>Lỗ hổng thật lượt 6 của
     *       Codex:</b> bản trước (lượt 5) khi nhóm của {@code tt} chỉ có 1
     *       ứng viên mỗi phía ({@code sameKeyTransport.size()<=1 &&
     *       sameKeyExcavation.size()<=1}) thì return ngay coi là "không mơ
     *       hồ" — nhưng KHÔNG hề kiểm tra bản thân {@code et} GỬI LÊN có
     *       cùng khoá với {@code tt} hay không! Client hoàn toàn có thể gửi
     *       2 id của 2 chuyến chả liên quan gì nhau (khác ngày/ca/xe/máy
     *       xúc) — nếu nhóm của mỗi bên riêng lẻ không có cạnh tranh, hàm cũ
     *       vẫn coi là "chắc chắn" và cho ghép/duyệt. Không kiểm tra khoá
     *       trước tiên thì các bước "đếm ứng viên cùng khoá" phía dưới hoàn
     *       toàn vô nghĩa — chúng được TÍNH TỪ khoá của {@code tt}, không hề
     *       đụng đến {@code et} nếu {@code et} lạc khoá.</li>
     *   <li><b>Khớp DUY NHẤT CẢ HAI CHIỀU</b> (mutual-unique-match, xem
     *       {@link #pairGroup}) — chỉ áp dụng khi CÙNG khoá và có cạnh
     *       tranh (nhiều hơn 1 ứng viên 1 trong 2 phía).</li>
     *   <li><b>Nội dung phải khớp {@link #isMatched} mới được DUYỆT</b>
     *       (chỉ áp dụng khi {@code status == APPROVED}) — <b>lỗ hổng thật
     *       khác lượt 6:</b> FE khoá nút "Duyệt" khi {@code isMatched=false}
     *       ({@code canApprove}, xem {@code reconciliationColumns.tsx}) —
     *       nhưng backend CHƯA TỪNG ép lại quy tắc này, chỉ kiểm tra pairing
     *       có xác định hay không, không kiểm tra NỘI DUNG có khớp không.
     *       Gọi API trực tiếp vẫn duyệt được 1 cặp cùng khoá nhưng lệch số
     *       liệu — hợp đồng FE/BE không nhất quán. {@code REVISION_REQUESTED}
     *       (yêu cầu sửa) KHÔNG bị chặn dù lệch nội dung — đó CHÍNH LÀ mục
     *       đích của đối chiếu: phát hiện lệch rồi yêu cầu sửa, không thể tự
     *       mâu thuẫn với quy trình nghiệp vụ.</li>
     * </ol>
     */
    private void assertValidPair(TransportReportTrip tt, ExcavationReportTrip et, ApprovalStatus status) {
        String key = buildTransportKey(tt);
        if (!key.equals(buildExcavationKey(et))) {
            throw new BadRequestException(
                    "Chuyến Vận tải #" + tt.getId() + " và chuyến Khai thác #" + et.getId()
                            + " không cùng khoá ghép (Thời gian/Ca/Máy xúc/Số xe khác nhau) — không phải một cặp hợp lệ.");
        }

        LocalDate date = tt.getTransportReport().getReportDate();
        List<TransportReportTrip> sameKeyTransport = transportReportTripRepository
                .findForReconciliation(date, date, null, null).stream()
                .filter(c -> buildTransportKey(c).equals(key))
                .toList();
        List<ExcavationReportTrip> sameKeyExcavation = excavationReportTripRepository
                .findForReconciliation(date, date, null, null).stream()
                .filter(c -> buildExcavationKey(c).equals(key))
                .toList();
        if (!(sameKeyTransport.size() <= 1 && sameKeyExcavation.size() <= 1)) {
            long excavationMatchesForTt = sameKeyExcavation.stream().filter(c -> isMatched(tt, c)).count();
            long transportMatchesForEt = sameKeyTransport.stream().filter(c -> isMatched(c, et)).count();
            boolean confident = isMatched(tt, et) && excavationMatchesForTt == 1 && transportMatchesForEt == 1;
            if (!confident) {
                throw new BadRequestException(
                        "Cặp chuyến Vận tải #" + tt.getId() + " - Khai thác #" + et.getId()
                                + " không xác định rõ ràng (nhiều chuyến cùng khoá ngày/ca/xe/máy xúc ở ít nhất 1 phía, "
                                + "không khớp DUY NHẤT cả hai chiều) — cần làm rõ dữ liệu trước khi duyệt/yêu cầu sửa cặp này.");
            }
        }

        if (status == ApprovalStatus.APPROVED && !isMatched(tt, et)) {
            throw new BadRequestException(
                    "Không thể duyệt cặp chuyến Vận tải #" + tt.getId() + " - Khai thác #" + et.getId()
                            + " vì dữ liệu 2 bên CHƯA khớp (Loại hàng/Số chuyến/Mức tải/Nhân viên) — "
                            + "cần yêu cầu sửa và thống nhất trước khi duyệt.");
        }
    }

    // ================= LƯU (sửa dữ liệu chuyến Vận tải/Khai thác, KHÔNG đổi trạng thái duyệt) =================

    @Transactional
    public void updateTrips(List<ReconciliationTripUpdateRequest> requests) {
        if (requests.isEmpty()) {
            return;
        }

        List<Long> transportTripIds = requests.stream()
                .map(ReconciliationTripUpdateRequest::getTransportReportTripId)
                .filter(Objects::nonNull).distinct().toList();

        List<Long> excavationTripIds = requests.stream()
                .map(ReconciliationTripUpdateRequest::getExcavationReportTripId)
                .filter(Objects::nonNull).distinct().toList();

        List<Long> cargoTypeIds = requests.stream()
                .map(ReconciliationTripUpdateRequest::getCargoTypeId)
                .filter(Objects::nonNull).distinct().toList();

        List<Long> employeeIds = requests.stream()
                .map(ReconciliationTripUpdateRequest::getEmployeeId)
                .filter(Objects::nonNull).distinct().toList();

        Map<Long, TransportReportTrip> transportTripById = transportReportTripRepository.findAllById(transportTripIds)
                .stream().collect(Collectors.toMap(TransportReportTrip::getId, t -> t));

        Map<Long, ExcavationReportTrip> excavationTripById = excavationReportTripRepository.findAllById(excavationTripIds)
                .stream().collect(Collectors.toMap(ExcavationReportTrip::getId, t -> t));

        Map<Long, CargoType> cargoTypeById = cargoTypeRepository.findAllById(cargoTypeIds)
                .stream().collect(Collectors.toMap(CargoType::getId, c -> c));

        Map<Long, User> employeeById = userRepository.findAllById(employeeIds)
                .stream().collect(Collectors.toMap(User::getId, u -> u));

        // Cache report theo key "reportDate|shiftId|...|employeeId" — tránh tạo trùng report mới
        // khi nhiều chuyến trong cùng batch cùng được chuyển tới cùng 1 report đích chưa tồn tại.
        Map<String, TransportReport> transportReportCache = new HashMap<>();
        Map<String, ExcavationReport> excavationReportCache = new HashMap<>();

        Set<TransportReport> transportReportsTouched = new LinkedHashSet<>();
        Set<ExcavationReport> excavationReportsTouched = new LinkedHashSet<>();

        List<String> errors = new ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            ReconciliationTripUpdateRequest req = requests.get(i);
            try {
                applyTripUpdate(req, transportTripById, excavationTripById, cargoTypeById, employeeById,
                        transportReportCache, excavationReportCache,
                        transportReportsTouched, excavationReportsTouched);
            } catch (Exception e) {
                errors.add("Mục thứ " + (i + 1) + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            throw new BadRequestException(String.join("; ", errors));
        }

        // Report nào rỗng (hết chuyến sau khi bị chuyển đi) -> xóa; còn lại -> lưu
        List<TransportReport> transportToSave = new ArrayList<>();
        List<TransportReport> transportToDelete = new ArrayList<>();
        for (TransportReport r : transportReportsTouched) {
            if (r.getTrips().isEmpty()) {
                transportToDelete.add(r);
            } else {
                transportToSave.add(r);
            }
        }

        List<ExcavationReport> excavationToSave = new ArrayList<>();
        List<ExcavationReport> excavationToDelete = new ArrayList<>();
        for (ExcavationReport r : excavationReportsTouched) {
            if (r.getTrips().isEmpty()) {
                excavationToDelete.add(r);
            } else {
                excavationToSave.add(r);
            }
        }

        if (!transportToSave.isEmpty()) transportReportRepository.saveAll(transportToSave);
        if (!excavationToSave.isEmpty()) excavationReportRepository.saveAll(excavationToSave);
        // Xóa report rỗng SAU khi đã save report đích — đảm bảo trip đã có "nhà mới" trước khi report cũ bị xóa
        if (!transportToDelete.isEmpty()) transportReportRepository.deleteAll(transportToDelete);
        if (!excavationToDelete.isEmpty()) excavationReportRepository.deleteAll(excavationToDelete);
        reconciliationEventPublisher.publishChanged();
    }

    private void applyTripUpdate(
            ReconciliationTripUpdateRequest req,
            Map<Long, TransportReportTrip> transportTripById,
            Map<Long, ExcavationReportTrip> excavationTripById,
            Map<Long, CargoType> cargoTypeById,
            Map<Long, User> employeeById,
            Map<String, TransportReport> transportReportCache,
            Map<String, ExcavationReport> excavationReportCache,
            Set<TransportReport> transportReportsTouched,
            Set<ExcavationReport> excavationReportsTouched) {

        boolean hasTransport = req.getTransportReportTripId() != null;
        boolean hasExcavation = req.getExcavationReportTripId() != null;

        if (hasTransport == hasExcavation) {
            throw new BadRequestException("Cần đúng 1 trong 2: chuyến Vận tải HOẶC chuyến Khai thác");
        }

        if (hasTransport) {
            TransportReportTrip trip = transportTripById.get(req.getTransportReportTripId());
            if (trip == null) {
                throw new ResourceNotFoundException("Không tìm thấy chuyến Vận tải: " + req.getTransportReportTripId());
            }
            assertTransportTripAccess(trip);

            // Chốt 2026-09-09: chuyến đã duyệt không được sửa qua "Lưu" ở Đối
            // chiếu nữa — phải để Thống kê gửi yêu cầu sửa trước.
            if (trip.getStatus() == ApprovalStatus.APPROVED) {
                throw new BadRequestException(
                        "Chuyến Vận tải #" + trip.getId() + " đã được duyệt đối chiếu — cần Thống kê gửi yêu cầu sửa trước khi được phép chỉnh sửa lại.");
            }

            if (req.getCargoTypeId() != null) {
                CargoType cargoType = cargoTypeById.get(req.getCargoTypeId());
                if (cargoType == null) {
                    throw new ResourceNotFoundException("Loại hàng không tồn tại: " + req.getCargoTypeId());
                }
                trip.setCargoType(cargoType);
                trip.setCargoGroup(cargoType.getCargoGroup());
            }
            if (req.getTripCount() != null) {
                trip.setTripCount(req.getTripCount());
            }
            if (req.getLoadLevelType() != null) {
                applyLoadLevel(trip.getLoadLevel(), req.getLoadLevelType(), req.getLoadLevelCustomValue());
            }

            // Sửa dữ liệu ngay ở màn Đối chiếu (nút "Lưu") trước đây KHÔNG đụng
            // status — nếu bên này đang REVISION_REQUESTED (đỏ nhạt), sửa xong
            // vẫn không tự "gửi lại" được. Đưa về PENDING + đồng bộ decision,
            // đúng luồng gửi lại như mọi đường sửa dữ liệu khác. Chốt 2026-09-08.
            trip.setStatus(ApprovalStatus.PENDING);
            syncTripStatusToPending(trip.getId(), true);

            TransportReport oldReport = trip.getTransportReport();
            transportReportsTouched.add(oldReport);

            if (req.getEmployeeId() != null && !req.getEmployeeId().equals(oldReport.getEmployee().getId())) {
                User newEmployee = employeeById.get(req.getEmployeeId());
                if (newEmployee == null) {
                    throw new ResourceNotFoundException("Nhân viên không tồn tại: " + req.getEmployeeId());
                }

                String key = oldReport.getReportDate() + "|" + oldReport.getShift().getId() + "|" + oldReport.getVehicle().getId() + "|" + newEmployee.getId();
                TransportReport targetReport = transportReportCache.computeIfAbsent(key, k ->
                        transportReportRepository
                                .findByReportDateAndShiftIdAndVehicleIdAndEmployeeId(oldReport.getReportDate(), oldReport.getShift().getId(), oldReport.getVehicle().getId(), newEmployee.getId())
                                .orElseGet(() -> {
                                    TransportReport newReport = new TransportReport();
                                    newReport.setReportDate(oldReport.getReportDate());
                                    newReport.setShift(oldReport.getShift());
                                    newReport.setVehicle(oldReport.getVehicle());
                                    newReport.setEmployee(newEmployee);
                                    newReport.setFuelBeginning(oldReport.getFuelBeginning());
                                    newReport.setFuelEnding(oldReport.getFuelEnding());
                                    newReport.setFuelReceived(oldReport.getFuelReceived());
                                    newReport.recalculateFuelUsed();
                                    return newReport;
                                }));

                // Chuyển chuyến sang report đích
                oldReport.getTrips().remove(trip);
                trip.setTransportReport(targetReport);
                targetReport.getTrips().add(trip);

                transportReportsTouched.add(targetReport);
            }

        } else {
            ExcavationReportTrip trip = excavationTripById.get(req.getExcavationReportTripId());
            if (trip == null) {
                throw new ResourceNotFoundException("Không tìm thấy chuyến Khai thác: " + req.getExcavationReportTripId());
            }
            assertExcavationTripAccess(trip);

            // Xem chú thích ở nhánh Vận tải phía trên — cùng lý do.
            if (trip.getStatus() == ApprovalStatus.APPROVED) {
                throw new BadRequestException(
                        "Chuyến Khai thác #" + trip.getId() + " đã được duyệt đối chiếu — cần Thống kê gửi yêu cầu sửa trước khi được phép chỉnh sửa lại.");
            }

            if (req.getCargoTypeId() != null) {
                CargoType cargoType = cargoTypeById.get(req.getCargoTypeId());
                if (cargoType == null) {
                    throw new ResourceNotFoundException("Loại hàng không tồn tại: " + req.getCargoTypeId());
                }
                trip.setCargoType(cargoType);
                trip.setCargoGroup(cargoType.getCargoGroup());
            }
            if (req.getTripCount() != null) {
                trip.setTripCount(req.getTripCount());
            }
            if (req.getLoadLevelType() != null) {
                applyLoadLevel(trip.getLoadLevel(), req.getLoadLevelType(), req.getLoadLevelCustomValue());
            }

            // Xem chú thích ở nhánh Vận tải phía trên — cùng lý do.
            trip.setStatus(ApprovalStatus.PENDING);
            syncTripStatusToPending(trip.getId(), false);

            ExcavationReport oldReport = trip.getExcavationReport();
            excavationReportsTouched.add(oldReport);

            if (req.getEmployeeId() != null && !req.getEmployeeId().equals(oldReport.getEmployee().getId())) {
                User newEmployee = employeeById.get(req.getEmployeeId());
                if (newEmployee == null) {
                    throw new ResourceNotFoundException("Nhân viên không tồn tại: " + req.getEmployeeId());
                }

                String key = oldReport.getReportDate() + "|" + oldReport.getShift().getId() + "|"
                        + oldReport.getExcavatorDevice().getId() + "|" + newEmployee.getId();
                ExcavationReport targetReport = excavationReportCache.computeIfAbsent(key, k ->
                        excavationReportRepository
                                .findByReportDateAndShiftIdAndExcavatorDeviceIdAndEmployeeId(
                                        oldReport.getReportDate(), oldReport.getShift().getId(),
                                        oldReport.getExcavatorDevice().getId(), newEmployee.getId())
                                .orElseGet(() -> {
                                    ExcavationReport newReport = new ExcavationReport();
                                    newReport.setReportDate(oldReport.getReportDate());
                                    newReport.setShift(oldReport.getShift());
                                    newReport.setExcavatorDevice(oldReport.getExcavatorDevice());
                                    newReport.setExcavationFloor(oldReport.getExcavationFloor());
                                    newReport.setReceivingLocation(oldReport.getReceivingLocation());
                                    newReport.setEmployee(newEmployee);
                                    newReport.setFuelBeginning(oldReport.getFuelBeginning());
                                    newReport.setFuelEnding(oldReport.getFuelEnding());
                                    newReport.setFuelReceived(oldReport.getFuelReceived());
                                    newReport.recalculateFuelUsed();
                                    return newReport;
                                }));

                oldReport.getTrips().remove(trip);
                trip.setExcavationReport(targetReport);
                targetReport.getTrips().add(trip);

                excavationReportsTouched.add(targetReport);
            }
        }
    }

    private void applyLoadLevel(LoadLevel loadLevel, LoadLevelType type, String customValue) {
        loadLevel.setType(type);
        if (type == LoadLevelType.OTHER) {
            if (customValue == null || !customValue.matches("^\\d+/\\d+$")) {
                throw new BadRequestException("Mức tải 'Khác' cần giá trị dạng x/y, ví dụ 1/2");
            }
            loadLevel.setCustomValue(customValue);
        } else {
            loadLevel.setCustomValue(null);
        }
    }

    // ================= SYNC TRIP STATUS =================

    /**
     * Khi report trip chuyển về PENDING (do bị update), đồng bộ reconciliation decision về PENDING.
     * Gọi từ TransportReportService / ExcavationReportService sau khi trip được update.
     *
     * <p>CHỈ đưa {@code decision.status} về PENDING khi nó CHƯA phải
     * REVISION_REQUESTED — nếu đang giữa 1 chu kỳ yêu cầu sửa (decision vẫn
     * REVISION_REQUESTED trong khi CHÍNH trip này vừa được sửa xong, tức
     * người dùng vừa "gửi lại"), phải GIỮ NGUYÊN decision.status để
     * {@link #computeRowStatus} còn nhận biết "đang chờ duyệt lại" (vàng
     * nhạt) một khi CẢ 2 bên đã hết REVISION_REQUESTED. Trước đây set vô
     * điều kiện — xoá mất tín hiệu này ngay khi 1 bên vừa gửi lại, khiến
     * dòng nhảy thẳng về trắng dù bên kia còn chưa sửa. Chốt 2026-09-08.
     */
    public void syncTripStatusToPending(Long tripId, boolean isTransport) {
        ReconciliationDecision decision = null;
        if (isTransport) {
            decision = reconciliationDecisionRepository.findByTransportReportTrip_Id(tripId).orElse(null);
        } else {
            decision = reconciliationDecisionRepository.findByExcavationReportTrip_Id(tripId).orElse(null);
        }
        if (decision != null && decision.getStatus() != ApprovalStatus.REVISION_REQUESTED) {
            decision.setStatus(ApprovalStatus.PENDING);
            reconciliationDecisionRepository.save(decision);
        }
    }

    // ================= GỬI LẠI (đúng theo từng bên đang chờ sửa) =================

    /**
     * Đưa từng bên có mặt trong request về PENDING NẾU bên đó thật sự đang
     * REVISION_REQUESTED — dùng cho nút "Gửi lại" ở màn Đối chiếu. KHÔNG đụng
     * decision.status trực tiếp (khác {@link #saveDecisions}, vốn dùng cho
     * hành động của thống kê viên) — tái dùng đúng
     * {@link #syncTripStatusToPending} để mọi đường "gửi lại" (nút này, và
     * sửa dữ liệu qua nhập liệu bình thường) đi qua đúng 1 điểm chốt.
     */
    @Transactional
    public void resubmitTrips(ReconciliationResubmitRequest request) {
        if (request.getTransportReportTripId() == null && request.getExcavationReportTripId() == null) {
            throw new BadRequestException("Cần ít nhất 1 trong 2: chuyến Vận tải hoặc chuyến Khai thác");
        }
        if (request.getTransportReportTripId() != null) {
            TransportReportTrip trip = transportReportTripRepository.findById(request.getTransportReportTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy chuyến Vận tải: " + request.getTransportReportTripId()));
            assertTransportTripAccess(trip);
            if (trip.getStatus() == ApprovalStatus.REVISION_REQUESTED) {
                trip.setStatus(ApprovalStatus.PENDING);
                transportReportTripRepository.save(trip);
                syncTripStatusToPending(trip.getId(), true);
            }
        }
        if (request.getExcavationReportTripId() != null) {
            ExcavationReportTrip trip = excavationReportTripRepository.findById(request.getExcavationReportTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy chuyến Khai thác: " + request.getExcavationReportTripId()));
            assertExcavationTripAccess(trip);
            if (trip.getStatus() == ApprovalStatus.REVISION_REQUESTED) {
                trip.setStatus(ApprovalStatus.PENDING);
                excavationReportTripRepository.save(trip);
                syncTripStatusToPending(trip.getId(), false);
            }
        }
        reconciliationEventPublisher.publishChanged();
    }

    // ================= LỊCH SỬ (xem qua icon "i" ở cột Sai lệch) =================

    public List<ReconciliationHistoryEntryResponse> getHistory(Long transportReportTripId, Long excavationReportTripId) {
        if (transportReportTripId == null && excavationReportTripId == null) {
            throw new BadRequestException("Cần ít nhất 1 trong 2: chuyến Vận tải hoặc chuyến Khai thác");
        }
        // Xác minh phạm vi đơn vị TRƯỚC khi trả lịch sử (Quality Gate lượt 3
        // của Codex, 2026-09-10): trước đây endpoint này truy vấn lịch sử
        // thẳng theo tripId, không load trip để kiểm tra — người có quyền
        // CHỨC NĂNG đọc reconciliation có thể dò/đoán tripId của đơn vị khác
        // để xem snapshot dữ liệu (tên NV, số thẻ lương, loại hàng...) của
        // đơn vị đó.
        if (transportReportTripId != null) {
            TransportReportTrip trip = transportReportTripRepository.findById(transportReportTripId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến Vận tải: " + transportReportTripId));
            assertTransportTripAccess(trip);
        }
        if (excavationReportTripId != null) {
            ExcavationReportTrip trip = excavationReportTripRepository.findById(excavationReportTripId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến Khai thác: " + excavationReportTripId));
            assertExcavationTripAccess(trip);
        }

        List<ReconciliationDataHistory> entries = new ArrayList<>();
        if (transportReportTripId != null) {
            entries.addAll(reconciliationDataHistoryRepository
                    .findByTripIdAndSideOrderByCreatedAtDesc(transportReportTripId, ReconciliationSide.TRANSPORT));
        }
        if (excavationReportTripId != null) {
            entries.addAll(reconciliationDataHistoryRepository
                    .findByTripIdAndSideOrderByCreatedAtDesc(excavationReportTripId, ReconciliationSide.EXCAVATION));
        }
        return entries.stream()
                .sorted(Comparator.comparing(ReconciliationDataHistory::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(h -> ReconciliationHistoryEntryResponse.builder()
                        .id(h.getId())
                        .side(h.getSide())
                        .cargoTypeName(h.getCargoTypeName())
                        .tripCount(h.getTripCount())
                        .loadLevelType(h.getLoadLevelType())
                        .loadLevelCustomValue(h.getLoadLevelCustomValue())
                        .employeeSalaryCode(h.getEmployeeSalaryCode())
                        .employeeFullName(h.getEmployeeFullName())
                        .note(h.getNote())
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();
    }
}