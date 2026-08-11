package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationDecisionRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationSearchRequest;
import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationFinalOption;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final TransportReportTripRepository transportReportTripRepository;
    private final ExcavationReportTripRepository excavationReportTripRepository;
    private final ReconciliationDecisionRepository reconciliationDecisionRepository;
    private final CargoTypeRepository cargoTypeRepository;

    public PageResponse<ReconciliationRowResponse> search(ReconciliationSearchRequest request, Pageable pageable) {
        List<TransportReportTrip> transportTrips = transportReportTripRepository.findForReconciliation(
                request.getFromDate(), request.getToDate(), request.getShiftIds(), request.getDeviceIds());

        List<ExcavationReportTrip> excavationTrips = excavationReportTripRepository.findForReconciliation(
                request.getFromDate(), request.getToDate(), request.getShiftIds(), request.getDeviceIds());

        // Gom chuyến Khai thác theo key (Ngày+Ca+Số xe+Máy xúc) để bắt cặp 1-1.
        // Dùng Deque để xử lý đúng trường hợp nhiều chuyến trùng key (poll từng cái một, tránh cross-join sai).
        Map<String, Deque<ExcavationReportTrip>> excavationByKey = new HashMap<>();
        for (ExcavationReportTrip et : excavationTrips) {
            excavationByKey.computeIfAbsent(buildExcavationKey(et), k -> new ArrayDeque<>()).add(et);
        }

        List<ReconciliationRowResponse> rows = new ArrayList<>();

        // 1. Duyệt từng chuyến Vận tải, tìm cặp khớp key bên Khai thác (nếu có)
        for (TransportReportTrip tt : transportTrips) {
            Deque<ExcavationReportTrip> candidates = excavationByKey.get(buildTransportKey(tt));
            ExcavationReportTrip matchedExcavation =
                    (candidates != null && !candidates.isEmpty()) ? candidates.poll() : null;
            rows.add(buildRow(tt, matchedExcavation));
        }

        // 2. Chuyến Khai thác còn dư (không có cặp Vận tải) — vẫn hiển thị, coi như không khớp
        for (Deque<ExcavationReportTrip> remaining : excavationByKey.values()) {
            for (ExcavationReportTrip et : remaining) {
                rows.add(buildRow(null, et));
            }
        }

        rows.sort(Comparator
                .comparing(ReconciliationRowResponse::getReportDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ReconciliationRowResponse::getShiftName, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ReconciliationRowResponse::getVehicleCode, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ReconciliationRowResponse::getExcavatorName, Comparator.nullsLast(Comparator.naturalOrder())));

        // Paginate kết quả sau khi match
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), rows.size());
        List<ReconciliationRowResponse> paginatedContent = start < rows.size()
                ? rows.subList(start, end)
                : List.of();

        Page<ReconciliationRowResponse> page = new PageImpl<>(paginatedContent, pageable, rows.size());
        return PageResponse.from(page);
    }

    private String buildTransportKey(TransportReportTrip tt) {
        TransportReport header = tt.getTransportReport();
        return header.getReportDate() + "_" + header.getShift().getId() + "_"
                + header.getDevice().getId() + "_" + tt.getExcavator().getId();
    }

    private String buildExcavationKey(ExcavationReportTrip et) {
        ExcavationReport header = et.getExcavationReport();
        return header.getReportDate() + "_" + header.getShift().getId() + "_"
                + et.getVehicle().getId() + "_" + header.getExcavatorDevice().getId();
    }

    private ReconciliationRowResponse buildRow(TransportReportTrip tt, ExcavationReportTrip et) {
        var builder = ReconciliationRowResponse.builder();

        if (tt != null) {
            TransportReport header = tt.getTransportReport();
            builder.transportReportTripId(tt.getId())
                    .reportDate(header.getReportDate())
                    .shiftName(header.getShift().getName())
                    .vehicleCode(header.getDevice().getCode())
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
                    .rainyDay(header.getRainyDay())
                    .supplementaryVehicle(header.getSupplementaryVehicle())
                    .transportData(ReconciliationTripDataResponse.builder()
                            .cargoTypeName(tt.getCargoType().getName())
                            .tripCount(tt.getTripCount())
                            .loadLevelType(tt.getLoadLevel().getType())
                            .loadLevelCustomValue(tt.getLoadLevel().getCustomValue())
                            .employeeSalaryCode(header.getEmployee().getSalaryCode())
                            .build());
        } else {
            // Chỉ có ở Khai thác — không có dữ liệu chi tiết Vận tải,
            // chỉ điền được các field trùng khóa (ngày/ca/xe/máy xúc).
            ExcavationReport header = et.getExcavationReport();
            builder.reportDate(header.getReportDate())
                    .shiftName(header.getShift().getName())
                    .vehicleCode(et.getVehicle().getCode())
                    .excavatorName(header.getExcavatorDevice().getName());
        }

        if (et != null) {
            ExcavationReport header = et.getExcavationReport();
            builder.excavationReportTripId(et.getId())
                    .excavationData(ReconciliationTripDataResponse.builder()
                            .cargoTypeName(et.getCargoType().getName())
                            .tripCount(et.getTripCount())
                            .loadLevelType(et.getLoadLevel().getType())
                            .loadLevelCustomValue(et.getLoadLevel().getCustomValue())
                            .employeeSalaryCode(header.getEmployee().getSalaryCode())
                            .build());
        }

        builder.matched(isMatched(tt, et));

        ReconciliationDecision decision = null;
        if (tt != null) {
            decision = reconciliationDecisionRepository.findByTransportReportTrip_Id(tt.getId()).orElse(null);
        }
        if (decision == null && et != null) {
            decision = reconciliationDecisionRepository.findByExcavationReportTrip_Id(et.getId()).orElse(null);
        }
        if (decision != null) {
            builder.decision(toDecisionResponse(decision));
        }

        return builder.build();
    }

    private boolean isMatched(TransportReportTrip tt, ExcavationReportTrip et) {
        if (tt == null || et == null) {
            return false; // chỉ tồn tại ở 1 bên -> luôn coi là không khớp
        }
        boolean cargoTypeSame = tt.getCargoType().getId().equals(et.getCargoType().getId());
        boolean tripCountSame = Objects.equals(tt.getTripCount(), et.getTripCount());
        boolean loadLevelSame = tt.getLoadLevel().getType() == et.getLoadLevel().getType()
                && Objects.equals(tt.getLoadLevel().getCustomValue(), et.getLoadLevel().getCustomValue());
        return cargoTypeSame && tripCountSame && loadLevelSame;
    }

    @Transactional
    public ReconciliationDecisionResponse saveDecision(ReconciliationDecisionRequest request) {
        if (request.getTransportReportTripId() == null && request.getExcavationReportTripId() == null) {
            throw new BadRequestException("Cần ít nhất 1 trong 2: chuyến Vận tải hoặc chuyến Khai thác");
        }

        ReconciliationDecision decision = null;
        if (request.getTransportReportTripId() != null) {
            decision = reconciliationDecisionRepository
                    .findByTransportReportTrip_Id(request.getTransportReportTripId()).orElse(null);
        }
        if (decision == null && request.getExcavationReportTripId() != null) {
            decision = reconciliationDecisionRepository
                    .findByExcavationReportTrip_Id(request.getExcavationReportTripId()).orElse(null);
        }
        if (decision == null) {
            decision = new ReconciliationDecision();
        }

        if (request.getTransportReportTripId() != null) {
            decision.setTransportReportTrip(transportReportTripRepository.findById(request.getTransportReportTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy chuyến Vận tải: " + request.getTransportReportTripId())));
        }
        if (request.getExcavationReportTripId() != null) {
            decision.setExcavationReportTrip(excavationReportTripRepository.findById(request.getExcavationReportTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy chuyến Khai thác: " + request.getExcavationReportTripId())));
        }

        decision.setFinalOption(request.getFinalOption());

        if (request.getFinalOption() == ReconciliationFinalOption.OTHER) {
            if (request.getCustomCargoTypeId() == null || request.getCustomTripCount() == null
                    || request.getCustomLoadLevelType() == null) {
                throw new BadRequestException("Chọn 'Khác' cần nhập đủ Loại hàng, Số chuyến, Tải trọng");
            }
            CargoType customCargoType = cargoTypeRepository.findById(request.getCustomCargoTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Loại hàng không tồn tại: " + request.getCustomCargoTypeId()));
            decision.setCustomCargoType(customCargoType);
            decision.setCustomTripCount(request.getCustomTripCount());

            LoadLevel customLoadLevel = new LoadLevel();
            customLoadLevel.setType(request.getCustomLoadLevelType());
            customLoadLevel.setCustomValue(
                    request.getCustomLoadLevelType() == LoadLevelType.OTHER
                            ? request.getCustomLoadLevelCustomValue() : null);
            decision.setCustomLoadLevel(customLoadLevel);
        } else {
            // Không phải OTHER -> xóa dữ liệu custom cũ nếu có, tránh rác
            decision.setCustomCargoType(null);
            decision.setCustomTripCount(null);
            decision.setCustomLoadLevel(null);
        }

        reconciliationDecisionRepository.save(decision);
        return toDecisionResponse(decision);
    }

    private ReconciliationDecisionResponse toDecisionResponse(ReconciliationDecision decision) {
        return ReconciliationDecisionResponse.builder()
                .finalOption(decision.getFinalOption())
                .customCargoTypeName(decision.getCustomCargoType() != null ? decision.getCustomCargoType().getName() : null)
                .customTripCount(decision.getCustomTripCount())
                .customLoadLevelType(decision.getCustomLoadLevel() != null ? decision.getCustomLoadLevel().getType() : null)
                .customLoadLevelCustomValue(decision.getCustomLoadLevel() != null ? decision.getCustomLoadLevel().getCustomValue() : null)
                .build();
    }
}
