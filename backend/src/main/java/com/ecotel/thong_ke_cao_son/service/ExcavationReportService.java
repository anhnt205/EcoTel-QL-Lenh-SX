package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationTripBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationReportBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ExcavationReportTripResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.mapper.ExcavationReportMapper;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import com.ecotel.thong_ke_cao_son.model.ExcavationReportTrip;
import com.ecotel.thong_ke_cao_son.model.LoadLevel;
import com.ecotel.thong_ke_cao_son.repository.PickupPointRepository;
import com.ecotel.thong_ke_cao_son.model.PickupPoint;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExcavationReportService {

    private final ExcavationReportRepository excavationReportRepository;
    private final ExcavationReportTripRepository excavationReportTripRepository;
    private final ReconciliationDecisionRepository reconciliationDecisionRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final LocationRepository locationRepository;
    private final PickupPointRepository pickupPointRepository;
    private final UserRepository userRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ExcavationReportMapper excavationReportMapper;
    @Lazy
    private final ReconciliationService reconciliationService;

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
                                                             List<Long> receivingLocationIds,
                                                             List<String> excavationFloors,
                                                             Pageable pageable) {
        return PageResponse.from(excavationReportRepository
                .search(fromDate, toDate, shiftIds, excavatorIds, receivingLocationIds, excavationFloors, pageable)
                .map(excavationReportMapper::toResponse));
    }

    /** Toàn bộ giá trị Tầng xúc trong khoảng ngày — xem javadoc repository. */
    @Transactional(readOnly = true)
    public List<String> getDistinctExcavationFloors(LocalDate fromDate, LocalDate toDate) {
        return excavationReportRepository.findDistinctExcavationFloors(fromDate, toDate);
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
        report.setReceivingLocation(getOrThrow(pickupPointRepository, request.getReceivingLocationId(), "Nơi chất tải"));
        report.setEmployee(getOrThrow(userRepository, request.getEmployeeId(), "Nhân viên"));
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

    // ================= TRIP-LEVEL OPERATIONS =================

    @Transactional(readOnly = true)
    public ExcavationReportTripResponse getTrip(Long tripId) {
        ExcavationReportTrip trip = excavationReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));
        return excavationReportMapper.toTripResponse(trip);
    }

    @Transactional
    public ExcavationReportTripResponse updateTrip(Long tripId, ExcavationReportTripRequest request) {
        ExcavationReportTrip trip = excavationReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));

        // Chốt 2026-09-09: chuyến đã duyệt đối chiếu không được sửa trực tiếp ở
        // nhập liệu nữa — phải để Thống kê gửi yêu cầu sửa (chuyển trạng thái
        // sang REVISION_REQUESTED) trước, mới được sửa + gửi lại.
        if (trip.getStatus() == ApprovalStatus.APPROVED) {
            throw new BadRequestException(
                    "Chuyến đã được duyệt đối chiếu — cần Thống kê gửi yêu cầu sửa trước khi được phép chỉnh sửa lại.");
        }

        updateTripFields(trip, request);
        trip.setStatus(ApprovalStatus.PENDING);
        excavationReportTripRepository.save(trip);

        // Sync reconciliation decision về PENDING
        reconciliationService.syncTripStatusToPending(trip.getId(), false);

        return excavationReportMapper.toTripResponse(trip);
    }

    @Transactional
    public void deleteTrip(Long tripId) {
        ExcavationReportTrip trip = excavationReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));

        // Xóa reconciliation decision liên quan trước
        reconciliationDecisionRepository.findByExcavationReportTrip_Id(tripId)
                .ifPresent(reconciliationDecisionRepository::delete);

        ExcavationReport report = trip.getExcavationReport();
        report.getTrips().remove(trip);

        if (report.getTrips().isEmpty()) {
            excavationReportRepository.delete(report);
        } else {
            excavationReportRepository.save(report);
        }
    }

    @Transactional
    public List<ExcavationReportTripResponse> bulkUpdateTrips(List<ExcavationTripBulkUpdateItem> items) {
        List<ExcavationReportTripResponse> results = new ArrayList<>();
        for (ExcavationTripBulkUpdateItem item : items) {
            ExcavationReportTrip trip = excavationReportTripRepository.findById(item.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + item.getId()));

            if (trip.getStatus() == ApprovalStatus.APPROVED) {
                throw new BadRequestException(
                        "Chuyến #" + item.getId() + " đã được duyệt đối chiếu — cần Thống kê gửi yêu cầu sửa trước khi được phép chỉnh sửa lại.");
            }

            updateTripFields(trip, item.getData());
            trip.setStatus(ApprovalStatus.PENDING);
            results.add(excavationReportMapper.toTripResponse(trip));

            // Sync reconciliation decision về PENDING
            reconciliationService.syncTripStatusToPending(trip.getId(), false);
        }

        excavationReportTripRepository.saveAll(results.stream()
                .map(r -> excavationReportTripRepository.findById(r.getId()).orElseThrow())
                .toList());
        return results;
    }

    @Transactional
    public BulkDeleteResponse bulkDeleteTrips(List<Long> tripIds) {
        List<ExcavationReportTrip> trips = excavationReportTripRepository.findAllById(tripIds);
        if (trips.size() != tripIds.size()) {
            Set<Long> foundIds = trips.stream().map(ExcavationReportTrip::getId).collect(Collectors.toSet());
            List<Long> missingIds = tripIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ResourceNotFoundException("Không tìm thấy chuyến: " + missingIds);
        }

        // Xóa reconciliation decisions liên quan trước
        reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(tripIds)
                .forEach(reconciliationDecisionRepository::delete);

        // Nhóm chuyến theo report
        Map<Long, List<ExcavationReportTrip>> tripsByReport = trips.stream()
                .collect(Collectors.groupingBy(t -> t.getExcavationReport().getId()));

        for (Map.Entry<Long, List<ExcavationReportTrip>> entry : tripsByReport.entrySet()) {
            ExcavationReport report = entry.getValue().get(0).getExcavationReport();
            report.getTrips().removeAll(entry.getValue());

            if (report.getTrips().isEmpty()) {
                excavationReportRepository.delete(report);
            } else {
                excavationReportRepository.save(report);
            }
        }

        return BulkDeleteResponse.builder()
                .requestedCount(tripIds.size())
                .deletedCount(trips.size())
                .build();
    }

    private void updateTripFields(ExcavationReportTrip trip, ExcavationReportTripRequest request) {
        trip.setVehicle(getOrThrow(deviceRepository, request.getVehicleId(), "Số xe"));

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
