package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationDecisionRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationSearchRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationTripUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ReportStatusUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.response.*;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
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
    private final UserRepository userRepository;
    private final TransportReportRepository transportReportRepository;
    private final ExcavationReportRepository excavationReportRepository;

    // ================= SEARCH (không đổi logic ghép cặp) =================

    public PageResponse<ReconciliationRowResponse> search(
            ReconciliationSearchRequest request, Pageable pageable) {

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

        // Lọc theo trạng thái duyệt của báo cáo (status trên header)
        if (request.getStatus() != null) {
            ApprovalStatus filterStatus = request.getStatus();
            rows = rows.stream().filter(row -> {
                boolean transportMatch = row.getTransportReportTripId() != null
                        && getTransportReportStatus(row.getTransportReportTripId()) == filterStatus;
                boolean excavationMatch = row.getExcavationReportTripId() != null
                        && getExcavationReportStatus(row.getExcavationReportTripId()) == filterStatus;
                return transportMatch || excavationMatch;
            }).toList();
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
                + header.getVehicle().getId() + "_" + tt.getExcavator().getId() + "_"
                + tt.getCargoType().getId();
    }

    private String buildExcavationKey(ExcavationReportTrip et) {
        ExcavationReport header = et.getExcavationReport();
        return header.getReportDate() + "_" + header.getShift().getId() + "_"
                + et.getVehicle().getId() + "_" + header.getExcavatorDevice().getId() + "_"
                + et.getCargoType().getId();
    }

    private ReconciliationRowResponse buildRow(TransportReportTrip tt, ExcavationReportTrip et) {
        var builder = ReconciliationRowResponse.builder();

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
                    .supplementaryVehicle(tt.getSupplementaryVehicle())
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
        }

        return builder.build();
    }

    private boolean isMatched(TransportReportTrip tt, ExcavationReportTrip et) {
        if (tt == null || et == null) {
            return false;
        }
        boolean cargoTypeSame = tt.getCargoType().getId().equals(et.getCargoType().getId());
        boolean tripCountSame = Objects.equals(tt.getTripCount(), et.getTripCount());
        boolean loadLevelSame = tt.getLoadLevel().getType() == et.getLoadLevel().getType()
                && Objects.equals(tt.getLoadLevel().getCustomValue(), et.getLoadLevel().getCustomValue());
        return cargoTypeSame && tripCountSame && loadLevelSame;
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
        return saved.stream().map(this::toDecisionResponse).toList();
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

        decision.setStatus(request.getStatus());
        decision.setNote(request.getNote());

        return decision;
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

        // Tự động reset status về PENDING khi report bị sửa chuyến
        for (TransportReport r : transportReportsTouched) {
            r.setStatus(ApprovalStatus.PENDING);
        }
        for (ExcavationReport r : excavationReportsTouched) {
            r.setStatus(ApprovalStatus.PENDING);
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

    private ApprovalStatus getTransportReportStatus(Long tripId) {
        return transportReportTripRepository.findById(tripId)
                .map(t -> t.getTransportReport().getStatus())
                .orElse(null);
    }

    private ApprovalStatus getExcavationReportStatus(Long tripId) {
        return excavationReportTripRepository.findById(tripId)
                .map(t -> t.getExcavationReport().getStatus())
                .orElse(null);
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

    // ================= UPDATE REPORT STATUS =================

    @Transactional
    public void updateReportStatus(ReportStatusUpdateRequest request) {
        updateReportStatusBatch(List.of(request));
    }

    @Transactional
    public void updateReportStatusBatch(List<ReportStatusUpdateRequest> requests) {
        if (requests.isEmpty()) {
            return;
        }

        List<String> errors = new ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            ReportStatusUpdateRequest req = requests.get(i);
            try {
                applyReportStatus(req);
            } catch (Exception e) {
                errors.add("Mục thứ " + (i + 1) + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            throw new BadRequestException(String.join("; ", errors));
        }
    }

    private void applyReportStatus(ReportStatusUpdateRequest req) {
        if (req.getReportType() == ReportStatusUpdateRequest.ReportType.TRANSPORT) {
            TransportReport report = transportReportRepository.findById(req.getReportId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo Vận tải: " + req.getReportId()));
            report.setStatus(req.getStatus());
            report.setNote(req.getNote());
            transportReportRepository.save(report);
        } else if (req.getReportType() == ReportStatusUpdateRequest.ReportType.EXCAVATION) {
            ExcavationReport report = excavationReportRepository.findById(req.getReportId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo Khai thác: " + req.getReportId()));
            report.setStatus(req.getStatus());
            report.setNote(req.getNote());
            excavationReportRepository.save(report);
        } else {
            throw new BadRequestException("Loại báo cáo không hợp lệ: " + req.getReportType());
        }
    }
}