package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TripBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportTripResponse;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.mapper.TransportReportMapper;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransportReportService {

    private final TransportReportRepository transportReportRepository;
    private final TransportReportTripRepository transportReportTripRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ReceivingFloorGroupCalculator floorGroupCalculator;
    private final TransportReportMapper transportReportMapper;
    @Lazy
    private final ReconciliationService reconciliationService;

    @Transactional
    public TransportReportResponse create(TransportReportRequest request) {
        TransportReport report = transportReportMapper.toEntity(request);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        for (TransportReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        transportReportRepository.save(report);
        return transportReportMapper.toResponse(report);
    }

    @Transactional
    public TransportReportResponse update(Long id, TransportReportRequest request) {
        TransportReport report = transportReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));

        transportReportMapper.updateEntity(request, report);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        // Replace toàn bộ trips cũ — orphanRemoval=true tự xóa trip cũ khi flush
        report.getTrips().clear();
        for (TransportReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        transportReportRepository.save(report);
        return transportReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public TransportReportResponse getById(Long id) {
        TransportReport report = transportReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        return transportReportMapper.toResponse(report);
    }

    // TransportReportService.search() — cập nhật để dùng 2 bước
    @Transactional(readOnly = true)
    public PageResponse<TransportReportResponse> search(LocalDate fromDate, LocalDate toDate,
                                                       List<Long> shiftIds, List<Long> deviceIds,
                                                       Pageable pageable) {
        Page<Long> idPage = transportReportRepository.searchIds(fromDate, toDate, shiftIds, deviceIds, pageable);
        List<TransportReport> reports = transportReportRepository.findAllByIdWithDetails(idPage.getContent());

        // Giữ đúng thứ tự theo idPage (JPA IN không đảm bảo thứ tự trả về)
        Map<Long, TransportReport> reportById = reports.stream()
                .collect(Collectors.toMap(TransportReport::getId, r -> r));
        List<TransportReportResponse> content = idPage.getContent().stream()
                .map(reportById::get)
                .filter(Objects::nonNull)
                .map(transportReportMapper::toResponse)
                .toList();

        return PageResponse.from(new PageImpl<>(content, pageable, idPage.getTotalElements()));
    }

    // Thêm vào TransportReportService
    @Transactional(readOnly = true)
    public List<TransportReport> findAllForExport(LocalDate fromDate, LocalDate toDate,
                                                  List<Long> shiftIds, List<Long> deviceIds) {
        List<Long> ids = transportReportRepository.searchAllIds(fromDate, toDate, shiftIds, deviceIds);
        return transportReportRepository.findAllByIdWithDetails(ids);
    }

    @Transactional
    public void delete(Long id) {
        TransportReport report = transportReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        transportReportRepository.delete(report);
    }

    // ============ Phần resolve quan hệ — không thuộc trách nhiệm của Mapper ============

    private void applyRelations(TransportReport report, TransportReportRequest request) {
        report.setShift(getOrThrow(shiftRepository, request.getShiftId(), "Ca"));
        report.setVehicle(getOrThrow(deviceRepository, request.getVehicleId(), "Số xe"));
        report.setEmployee(getOrThrow(userRepository, request.getEmployeeId(), "Nhân viên"));
    }

    private TransportReportTrip buildTrip(TransportReport report, TransportReportTripRequest tripReq) {
        TransportReportTrip trip = transportReportMapper.toTripEntity(tripReq);
        trip.setTransportReport(report);

        trip.setRainyDay(tripReq.getRainyDay() != null ? tripReq.getRainyDay() : false);
        trip.setSupplementaryVehicle(tripReq.getSupplementaryVehicle() != null ? tripReq.getSupplementaryVehicle() : false);

        Location excavationArea = getOrThrow(locationRepository, tripReq.getExcavationAreaId(), "Khu vực xúc");
        trip.setExcavationArea(excavationArea);
        trip.setExcavator(getOrThrow(deviceRepository, tripReq.getExcavatorDeviceId(), "Máy xúc"));
        trip.setLoadingPoint(getOrThrow(locationRepository, tripReq.getLoadingPointId(), "Nơi nhận tải"));
        trip.setUnloadingPoint(getOrThrow(locationRepository, tripReq.getUnloadingPointId(), "Nơi dỡ tải"));

        CargoType cargoType = getOrThrow(cargoTypeRepository, tripReq.getCargoTypeId(), "Loại hàng");
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup());

        trip.setReceivingFloorGroup(
                floorGroupCalculator.calculate(excavationArea.getName(), tripReq.getReceivingFloor()));

        LoadLevel loadLevel = new LoadLevel();
        loadLevel.setType(tripReq.getLoadLevelType());
        loadLevel.setCustomValue(
                tripReq.getLoadLevelType() == LoadLevelType.OTHER ? tripReq.getLoadLevelCustomValue() : null);
        trip.setLoadLevel(loadLevel);

        return trip;
    }

    private <T, ID> T getOrThrow(JpaRepository<T, ID> repo, ID id, String label) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(label + " không tồn tại: " + id));
    }

    @Transactional
    public List<TransportReportResponse> bulkCreate(List<TransportReportRequest> requests) {
        List<TransportReportResponse> results = new ArrayList<>();
        for (TransportReportRequest request : requests) {
            results.add(create(request));
        }
        return results;
    }

    @Transactional
    public List<TransportReportResponse> bulkUpdate(List<TransportReportBulkUpdateItem> items) {
        List<TransportReportResponse> results = new ArrayList<>();
        for (TransportReportBulkUpdateItem item : items) {
            results.add(update(item.getId(), item.getData()));
        }
        return results;
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<TransportReport> reports = transportReportRepository.findAllById(ids);
        if (reports.size() != ids.size()) {
            Set<Long> foundIds = reports.stream().map(TransportReport::getId).collect(Collectors.toSet());
            List<Long> missingIds = ids.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ResourceNotFoundException("Không tìm thấy báo cáo với ID: " + missingIds);
        }
        transportReportRepository.deleteAll(reports);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(reports.size())
                .build();
    }

    // ================= TRIP-LEVEL OPERATIONS =================

    @Transactional(readOnly = true)
    public TransportReportTripResponse getTrip(Long tripId) {
        TransportReportTrip trip = transportReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));
        return transportReportMapper.toTripResponse(trip);
    }

    @Transactional
    public TransportReportTripResponse updateTrip(Long tripId, TransportReportTripRequest request) {
        TransportReportTrip trip = transportReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));

        updateTripFields(trip, request);
        trip.setStatus(ApprovalStatus.PENDING);
        transportReportTripRepository.save(trip);

        // Sync reconciliation decision về PENDING
        reconciliationService.syncTripStatusToPending(trip.getId(), true);

        return transportReportMapper.toTripResponse(trip);
    }

    @Transactional
    public void deleteTrip(Long tripId) {
        TransportReportTrip trip = transportReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));

        TransportReport report = trip.getTransportReport();
        report.getTrips().remove(trip);

        if (report.getTrips().isEmpty()) {
            transportReportRepository.delete(report);
        } else {
            transportReportRepository.save(report);
        }
    }

    @Transactional
    public List<TransportReportTripResponse> bulkUpdateTrips(List<TripBulkUpdateItem> items) {
        List<TransportReportTripResponse> results = new ArrayList<>();
        for (TripBulkUpdateItem item : items) {
            TransportReportTrip trip = transportReportTripRepository.findById(item.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + item.getId()));

            updateTripFields(trip, item.getData());
            trip.setStatus(ApprovalStatus.PENDING);
            results.add(transportReportMapper.toTripResponse(trip));

            // Sync reconciliation decision về PENDING
            reconciliationService.syncTripStatusToPending(trip.getId(), true);
        }

        transportReportTripRepository.saveAll(results.stream()
                .map(r -> transportReportTripRepository.findById(r.getId()).orElseThrow())
                .toList());
        return results;
    }

    @Transactional
    public BulkDeleteResponse bulkDeleteTrips(List<Long> tripIds) {
        List<TransportReportTrip> trips = transportReportTripRepository.findAllById(tripIds);
        if (trips.size() != tripIds.size()) {
            Set<Long> foundIds = trips.stream().map(TransportReportTrip::getId).collect(Collectors.toSet());
            List<Long> missingIds = tripIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ResourceNotFoundException("Không tìm thấy chuyến: " + missingIds);
        }

        // Nhóm chuyến theo report
        Map<Long, List<TransportReportTrip>> tripsByReport = trips.stream()
                .collect(Collectors.groupingBy(t -> t.getTransportReport().getId()));

        for (Map.Entry<Long, List<TransportReportTrip>> entry : tripsByReport.entrySet()) {
            TransportReport report = entry.getValue().get(0).getTransportReport();
            report.getTrips().removeAll(entry.getValue());

            if (report.getTrips().isEmpty()) {
                transportReportRepository.delete(report);
            } else {
                transportReportRepository.save(report);
            }
        }

        return BulkDeleteResponse.builder()
                .requestedCount(tripIds.size())
                .deletedCount(trips.size())
                .build();
    }

    private void updateTripFields(TransportReportTrip trip, TransportReportTripRequest request) {
        trip.setRainyDay(request.getRainyDay() != null ? request.getRainyDay() : false);
        trip.setSupplementaryVehicle(request.getSupplementaryVehicle() != null ? request.getSupplementaryVehicle() : false);

        trip.setExcavationArea(getOrThrow(locationRepository, request.getExcavationAreaId(), "Khu vực xúc"));
        trip.setExcavator(getOrThrow(deviceRepository, request.getExcavatorDeviceId(), "Máy xúc"));
        trip.setLoadingPoint(getOrThrow(locationRepository, request.getLoadingPointId(), "Nơi nhận tải"));
        trip.setUnloadingPoint(getOrThrow(locationRepository, request.getUnloadingPointId(), "Nơi dỡ tải"));

        trip.setReceivingFloor(request.getReceivingFloor());
        trip.setReceivingFloorGroup(floorGroupCalculator.calculate(trip.getExcavationArea().getName(), request.getReceivingFloor()));
        trip.setUnloadingFloor(request.getUnloadingFloor());
        trip.setTotalRouteDistanceKm(request.getTotalRouteDistanceKm());
        trip.setTotalRouteLiftM(request.getTotalRouteLiftM());
        trip.setLocalSlopeDistanceKm(request.getLocalSlopeDistanceKm());
        trip.setLocalSlopeM(request.getLocalSlopeM());

        CargoType cargoType = getOrThrow(cargoTypeRepository, request.getCargoTypeId(), "Loại hàng");
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup());

        trip.setTripCount(request.getTripCount());

        LoadLevel loadLevel = new LoadLevel();
        loadLevel.setType(request.getLoadLevelType());
        loadLevel.setCustomValue(
                request.getLoadLevelType() == LoadLevelType.OTHER ? request.getLoadLevelCustomValue() : null);
        trip.setLoadLevel(loadLevel);
    }
}
