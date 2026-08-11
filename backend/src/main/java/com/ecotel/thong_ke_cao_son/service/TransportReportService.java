package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.mapper.TransportReportMapper;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransportReportService {

    private final TransportReportRepository transportReportRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final CargoTypeRepository cargoTypeRepository;
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

    @Transactional(readOnly = true)
    public PageResponse<TransportReportResponse> search(LocalDate fromDate, LocalDate toDate,
                                                       List<Long> shiftIds, List<Long> deviceIds,
                                                       Pageable pageable) {
        return PageResponse.from(
                transportReportRepository.search(fromDate, toDate, shiftIds, deviceIds, pageable)
                        .map(transportReportMapper::toResponse));
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
        report.setDevice(getOrThrow(deviceRepository, request.getDeviceId(), "Xe"));
        report.setEmployee(getOrThrow(userRepository, request.getEmployeeId(), "Nhân viên"));
    }

    private TransportReportTrip buildTrip(TransportReport report, TransportReportTripRequest tripReq) {
        TransportReportTrip trip = transportReportMapper.toTripEntity(tripReq);
        trip.setTransportReport(report);

        Location excavationArea = getOrThrow(locationRepository, tripReq.getExcavationAreaId(), "Khu vực xúc");
        trip.setExcavationArea(excavationArea);
        trip.setExcavator(getOrThrow(deviceRepository, tripReq.getExcavatorDeviceId(), "Máy xúc"));
        trip.setLoadingPoint(getOrThrow(locationRepository, tripReq.getLoadingPointId(), "Nơi nhận tải"));
        trip.setUnloadingPoint(getOrThrow(locationRepository, tripReq.getUnloadingPointId(), "Nơi dỡ tải"));

        // Loại hàng chọn trực tiếp; Nhóm hàng LUÔN lấy tự động theo cargoType.cargoGroup,
        // không nhận cargoGroupId từ request (đúng nghiệp vụ: 1 Nhóm hàng có nhiều Loại hàng).
        CargoType cargoType = getOrThrow(cargoTypeRepository, tripReq.getCargoTypeId(), "Loại hàng");
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup());

        // Nhóm tầng nhận tải — tính tự động, không nhận từ request
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
}
