package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationTripReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ExcavationTripReportMapper;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.model.ExcavationTripReport;
import com.ecotel.thong_ke_cao_son.model.ExcavationTripReportTrip;
import com.ecotel.thong_ke_cao_son.model.LoadLevel;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExcavationTripReportService {

    private final ExcavationTripReportRepository excavationTripReportRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ExcavationTripReportMapper excavationTripReportMapper;

    @Transactional
    public ExcavationTripReportResponse create(ExcavationTripReportRequest request) {
        ExcavationTripReport report = excavationTripReportMapper.toEntity(request);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        for (ExcavationTripReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        excavationTripReportRepository.save(report);
        return excavationTripReportMapper.toResponse(report);
    }

    @Transactional
    public ExcavationTripReportResponse update(Long id, ExcavationTripReportRequest request) {
        ExcavationTripReport report = excavationTripReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));

        excavationTripReportMapper.updateEntity(request, report);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        report.getTrips().clear();
        for (ExcavationTripReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        excavationTripReportRepository.save(report);
        return excavationTripReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public ExcavationTripReportResponse getById(Long id) {
        ExcavationTripReport report = excavationTripReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        return excavationTripReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public PageResponse<ExcavationTripReportResponse> search(LocalDate fromDate, LocalDate toDate,
                                                             List<Long> shiftIds, List<Long> excavatorIds,
                                                             Pageable pageable) {
        return PageResponse.from(excavationTripReportRepository.search(fromDate, toDate, shiftIds, excavatorIds, pageable)
                .map(excavationTripReportMapper::toResponse));
    }

    @Transactional
    public void delete(Long id) {
        ExcavationTripReport report = excavationTripReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        excavationTripReportRepository.delete(report);
    }

    private void applyRelations(ExcavationTripReport report, ExcavationTripReportRequest request) {
        report.setShift(getOrThrow(shiftRepository, request.getShiftId(), "Ca"));
        report.setExcavatorDevice(getOrThrow(deviceRepository, request.getExcavatorDeviceId(), "Máy xúc"));
        report.setReceivingLocation(getOrThrow(locationRepository, request.getReceivingLocationId(), "Nơi nhận tải"));
        report.setEmployee(getOrThrow(userRepository, request.getEmployeeId(), "Nhân viên"));
    }

    private ExcavationTripReportTrip buildTrip(ExcavationTripReport report, ExcavationTripReportTripRequest tripReq) {
        ExcavationTripReportTrip trip = excavationTripReportMapper.toTripEntity(tripReq);
        trip.setExcavationTripReport(report);

        trip.setVehicle(getOrThrow(deviceRepository, tripReq.getVehicleId(), "Số xe"));
        trip.setDropOffLocation(getOrThrow(locationRepository, tripReq.getDropOffLocationId(), "Vị trí đổ"));

        CargoType cargoType = getOrThrow(cargoTypeRepository, tripReq.getCargoTypeId(), "Loại hàng");
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup()); // tự động lấy theo Loại hàng

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
