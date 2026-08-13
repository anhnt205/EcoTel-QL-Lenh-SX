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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final TransportReportTripRepository transportReportTripRepository;
    private final ExcavationReportTripRepository excavationReportTripRepository;
    private final ReconciliationDecisionRepository reconciliationDecisionRepository;
    private final CargoTypeRepository cargoTypeRepository;

    public PageResponse<ReconciliationRowResponse> search(
            ReconciliationSearchRequest request, Boolean finalizedOnly, Pageable pageable) {

        List<TransportReportTrip> transportTrips = transportReportTripRepository.findForReconciliation(
                request.getFromDate(), request.getToDate(), request.getShiftIds(), request.getDeviceIds());

        List<ExcavationReportTrip> excavationTrips = excavationReportTripRepository.findForReconciliation(
                request.getFromDate(), request.getToDate(), request.getShiftIds(), request.getDeviceIds());

        Map<String, Deque<ExcavationReportTrip>> excavationByKey = new HashMap<>();
        for (ExcavationReportTrip et : excavationTrips) {
            excavationByKey.computeIfAbsent(buildExcavationKey(et), k -> new ArrayDeque<>()).add(et);
        }

        List<ReconciliationRowResponse> rows = new ArrayList<>();

        for (TransportReportTrip tt : transportTrips) {
            Deque<ExcavationReportTrip> candidates = excavationByKey.get(buildTransportKey(tt));
            ExcavationReportTrip matchedExcavation =
                    (candidates != null && !candidates.isEmpty()) ? candidates.poll() : null;
            rows.add(buildRow(tt, matchedExcavation));
        }

        for (Deque<ExcavationReportTrip> remaining : excavationByKey.values()) {
            for (ExcavationReportTrip et : remaining) {
                rows.add(buildRow(null, et));
            }
        }

        // Lọc chỉ giữ những dòng đã chốt phương án, nếu được yêu cầu
        if (Boolean.TRUE.equals(finalizedOnly)) {
            rows = rows.stream().filter(row -> row.getDecision() != null).toList();
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

    private String buildTransportKey(TransportReportTrip tt) {
        TransportReport header = tt.getTransportReport();
        return header.getReportDate() + "_" + header.getShift().getId() + "_"
                + tt.getVehicle().getId() + "_" + tt.getExcavator().getId();
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
                    .vehicleCode(tt.getVehicle().getCode())   // đổi từ header.getDevice() -> tt.getVehicle()
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
                    .rainyDay(tt.getRainyDay())                          // đổi từ header -> trip
                    .supplementaryVehicle(tt.getSupplementaryVehicle())  // đổi từ header -> trip
                    .transportData(ReconciliationTripDataResponse.builder()
                            .cargoTypeName(tt.getCargoType().getName())
                            .tripCount(tt.getTripCount())
                            .loadLevelType(tt.getLoadLevel().getType())
                            .loadLevelCustomValue(tt.getLoadLevel().getCustomValue())
                            .employeeSalaryCode(header.getEmployee().getSalaryCode())
                            .build());
        } else {
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
            builder.resolvedData(resolveTripData(decision, tt, et));
        }

        return builder.build();
    }

    /**
     * Trả về dữ liệu hiển thị theo đúng phương án đã chốt:
     * - TRANSPORT: lấy nguyên dữ liệu từ báo cáo Vận tải
     * - EXCAVATION: lấy nguyên dữ liệu từ báo cáo Khai thác
     * - OTHER: lấy dữ liệu người dùng tự nhập khi chốt
     */
    private ReconciliationTripDataResponse resolveTripData(
            ReconciliationDecision decision, TransportReportTrip tt, ExcavationReportTrip et) {

        return switch (decision.getFinalOption()) {
            case TRANSPORT -> {
                if (tt == null) yield null; // phương án chốt là Vận tải nhưng chuyến Vận tải không tồn tại -> không có dữ liệu để trả
                yield ReconciliationTripDataResponse.builder()
                        .cargoTypeName(tt.getCargoType().getName())
                        .tripCount(tt.getTripCount())
                        .loadLevelType(tt.getLoadLevel().getType())
                        .loadLevelCustomValue(tt.getLoadLevel().getCustomValue())
                        .employeeSalaryCode(tt.getTransportReport().getEmployee().getSalaryCode())
                        .build();
            }
            case EXCAVATION -> {
                if (et == null) yield null;
                yield ReconciliationTripDataResponse.builder()
                        .cargoTypeName(et.getCargoType().getName())
                        .tripCount(et.getTripCount())
                        .loadLevelType(et.getLoadLevel().getType())
                        .loadLevelCustomValue(et.getLoadLevel().getCustomValue())
                        .employeeSalaryCode(et.getExcavationReport().getEmployee().getSalaryCode())
                        .build();
            }
            case OTHER -> ReconciliationTripDataResponse.builder()
                    .cargoTypeName(decision.getCustomCargoType() != null ? decision.getCustomCargoType().getName() : null)
                    .tripCount(decision.getCustomTripCount())
                    .loadLevelType(decision.getCustomLoadLevel() != null ? decision.getCustomLoadLevel().getType() : null)
                    .loadLevelCustomValue(decision.getCustomLoadLevel() != null ? decision.getCustomLoadLevel().getCustomValue() : null)
                    .employeeSalaryCode(null) // OTHER không có nguồn nhân viên xác định — để trống
                    .build();
        };
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
        return saveDecisions(List.of(request)).get(0);
    }

    @Transactional
    public List<ReconciliationDecisionResponse> saveDecisions(List<ReconciliationDecisionRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }

        // ===== Bước 1: Gom toàn bộ ID cần tra cứu, chỉ query 1 lần cho mỗi loại =====
        List<Long> transportTripIds = requests.stream()
                .map(ReconciliationDecisionRequest::getTransportReportTripId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<Long> excavationTripIds = requests.stream()
                .map(ReconciliationDecisionRequest::getExcavationReportTripId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<Long> customCargoTypeIds = requests.stream()
                .filter(r -> r.getFinalOption() == ReconciliationFinalOption.OTHER)
                .map(ReconciliationDecisionRequest::getCustomCargoTypeId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // ===== Bước 2: Query hàng loạt, dựng map để tra cứu O(1) =====
        Map<Long, TransportReportTrip> transportTripById = transportReportTripRepository.findAllById(transportTripIds)
                .stream().collect(Collectors.toMap(TransportReportTrip::getId, t -> t));

        Map<Long, ExcavationReportTrip> excavationTripById = excavationReportTripRepository.findAllById(excavationTripIds)
                .stream().collect(Collectors.toMap(ExcavationReportTrip::getId, t -> t));

        Map<Long, CargoType> cargoTypeById = cargoTypeRepository.findAllById(customCargoTypeIds)
                .stream().collect(Collectors.toMap(CargoType::getId, c -> c));

        // Decision đã tồn tại — tra theo cả 2 chiều (transportTrip / excavationTrip) rồi gộp lại theo id thật
        Map<Long, ReconciliationDecision> existingByTransportTripId =
                reconciliationDecisionRepository.findByTransportReportTrip_IdIn(transportTripIds).stream()
                        .collect(Collectors.toMap(d -> d.getTransportReportTrip().getId(), d -> d));

        Map<Long, ReconciliationDecision> existingByExcavationTripId =
                reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(excavationTripIds).stream()
                        .collect(Collectors.toMap(d -> d.getExcavationReportTrip().getId(), d -> d));

        // ===== Bước 3: Xử lý từng request trong bộ nhớ, không query thêm =====
        List<ReconciliationDecision> toSave = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            ReconciliationDecisionRequest request = requests.get(i);
            try {
                toSave.add(buildDecision(request, transportTripById, excavationTripById, cargoTypeById,
                        existingByTransportTripId, existingByExcavationTripId));
            } catch (Exception e) {
                errors.add("Mục thứ " + (i + 1) + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            throw new BadRequestException(String.join("; ", errors));
        }

        // ===== Bước 4: Lưu 1 lần duy nhất =====
        List<ReconciliationDecision> saved = reconciliationDecisionRepository.saveAll(toSave);
        return saved.stream().map(this::toDecisionResponse).toList();
    }

    private ReconciliationDecision buildDecision(
            ReconciliationDecisionRequest request,
            Map<Long, TransportReportTrip> transportTripById,
            Map<Long, ExcavationReportTrip> excavationTripById,
            Map<Long, CargoType> cargoTypeById,
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

        if (request.getTransportReportTripId() != null) {
            TransportReportTrip trip = transportTripById.get(request.getTransportReportTripId());
            if (trip == null) {
                throw new ResourceNotFoundException("Không tìm thấy chuyến Vận tải: " + request.getTransportReportTripId());
            }
            decision.setTransportReportTrip(trip);
        }
        if (request.getExcavationReportTripId() != null) {
            ExcavationReportTrip trip = excavationTripById.get(request.getExcavationReportTripId());
            if (trip == null) {
                throw new ResourceNotFoundException("Không tìm thấy chuyến Khai thác: " + request.getExcavationReportTripId());
            }
            decision.setExcavationReportTrip(trip);
        }

        decision.setFinalOption(request.getFinalOption());

        if (request.getFinalOption() == ReconciliationFinalOption.OTHER) {
            if (request.getCustomCargoTypeId() == null || request.getCustomTripCount() == null
                    || request.getCustomLoadLevelType() == null) {
                throw new BadRequestException("Chọn 'Khác' cần nhập đủ Loại hàng, Số chuyến, Tải trọng");
            }
            CargoType customCargoType = cargoTypeById.get(request.getCustomCargoTypeId());
            if (customCargoType == null) {
                throw new ResourceNotFoundException("Loại hàng không tồn tại: " + request.getCustomCargoTypeId());
            }
            decision.setCustomCargoType(customCargoType);
            decision.setCustomTripCount(request.getCustomTripCount());

            LoadLevel customLoadLevel = new LoadLevel();
            customLoadLevel.setType(request.getCustomLoadLevelType());
            customLoadLevel.setCustomValue(
                    request.getCustomLoadLevelType() == LoadLevelType.OTHER
                            ? request.getCustomLoadLevelCustomValue() : null);
            decision.setCustomLoadLevel(customLoadLevel);
        } else {
            decision.setCustomCargoType(null);
            decision.setCustomTripCount(null);
            decision.setCustomLoadLevel(null);
        }

        return decision;
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
