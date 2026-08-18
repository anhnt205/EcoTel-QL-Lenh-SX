package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.mapper.TransportReportMapper;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
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
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final DepartmentRepository departmentRepository;
    private final ReceivingFloorGroupCalculator floorGroupCalculator;
    private final TransportReportMapper transportReportMapper;

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
        if (request.getDepartmentId() != null) {
            report.setDepartment(getOrThrow(departmentRepository, request.getDepartmentId(), "Phòng ban"));
        } else {
            report.setDepartment(null);
        }
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
}
