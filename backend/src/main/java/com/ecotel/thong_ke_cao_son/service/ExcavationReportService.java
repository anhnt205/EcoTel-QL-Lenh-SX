package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationReportBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ExcavationReportMapper;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import com.ecotel.thong_ke_cao_son.model.ExcavationReportTrip;
import com.ecotel.thong_ke_cao_son.model.LoadLevel;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExcavationReportService {

    private final ExcavationReportRepository excavationReportRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final DepartmentRepository departmentRepository;
    private final ExcavationReportMapper excavationReportMapper;

    @Transactional
    public ExcavationReportResponse create(ExcavationReportRequest request) {
        ExcavationReport report = excavationReportMapper.toEntity(request);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        for (ExcavationReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        excavationReportRepository.save(report);
        return excavationReportMapper.toResponse(report);
    }

    @Transactional
    public ExcavationReportResponse update(Long id, ExcavationReportRequest request) {
        ExcavationReport report = excavationReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));

        excavationReportMapper.updateEntity(request, report);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        report.getTrips().clear();
        for (ExcavationReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        excavationReportRepository.save(report);
        return excavationReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public ExcavationReportResponse getById(Long id) {
        ExcavationReport report = excavationReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        return excavationReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public PageResponse<ExcavationReportResponse> search(LocalDate fromDate, LocalDate toDate,
                                                             List<Long> shiftIds, List<Long> excavatorIds,
                                                             Pageable pageable) {
        return PageResponse.from(excavationReportRepository.search(fromDate, toDate, shiftIds, excavatorIds, pageable)
                .map(excavationReportMapper::toResponse));
    }

    @Transactional
    public void delete(Long id) {
        ExcavationReport report = excavationReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        excavationReportRepository.delete(report);
    }

    private void applyRelations(ExcavationReport report, ExcavationReportRequest request) {
        report.setShift(getOrThrow(shiftRepository, request.getShiftId(), "Ca"));
        report.setExcavatorDevice(getOrThrow(deviceRepository, request.getExcavatorDeviceId(), "Máy xúc"));
        report.setReceivingLocation(getOrThrow(locationRepository, request.getReceivingLocationId(), "Nơi nhận tải"));
        report.setEmployee(getOrThrow(userRepository, request.getEmployeeId(), "Nhân viên"));
        if (request.getDepartmentId() != null) {
            report.setDepartment(getOrThrow(departmentRepository, request.getDepartmentId(), "Phòng ban"));
        } else {
            report.setDepartment(null);
        }
    }

    private ExcavationReportTrip buildTrip(ExcavationReport report, ExcavationReportTripRequest tripReq) {
        ExcavationReportTrip trip = excavationReportMapper.toTripEntity(tripReq);
        trip.setExcavationReport(report);

        trip.setVehicle(getOrThrow(deviceRepository, tripReq.getVehicleId(), "Số xe"));
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

    @Transactional
    public List<ExcavationReportResponse> bulkCreate(List<ExcavationReportRequest> requests) {
        List<ExcavationReportResponse> results = new ArrayList<>();
        for (ExcavationReportRequest request : requests) {
            results.add(create(request));
        }
        return results;
    }

    @Transactional
    public List<ExcavationReportResponse> bulkUpdate(List<ExcavationReportBulkUpdateItem> items) {
        List<ExcavationReportResponse> results = new ArrayList<>();
        for (ExcavationReportBulkUpdateItem item : items) {
            results.add(update(item.getId(), item.getData()));
        }
        return results;
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<ExcavationReport> reports = excavationReportRepository.findAllById(ids);
        if (reports.size() != ids.size()) {
            Set<Long> foundIds = reports.stream().map(ExcavationReport::getId).collect(Collectors.toSet());
            List<Long> missingIds = ids.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ResourceNotFoundException("Không tìm thấy báo cáo với ID: " + missingIds);
        }
        excavationReportRepository.deleteAll(reports);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(reports.size())
                .build();
    }
}
