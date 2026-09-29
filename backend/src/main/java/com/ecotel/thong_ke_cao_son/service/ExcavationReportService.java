package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportTripUpdateRequest;
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
import com.ecotel.thong_ke_cao_son.exception.ForbiddenException;
import com.ecotel.thong_ke_cao_son.mapper.ExcavationReportMapper;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import com.ecotel.thong_ke_cao_son.model.ExcavationReportTrip;
import com.ecotel.thong_ke_cao_son.model.LoadLevel;
import com.ecotel.thong_ke_cao_son.repository.PickupPointRepository;
import com.ecotel.thong_ke_cao_son.model.PickupPoint;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.security.AppUserDetails;
import com.ecotel.thong_ke_cao_son.security.SecurityUtils;
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
    private final ReconciliationEventPublisher reconciliationEventPublisher;
    @Lazy
    private final ReconciliationService reconciliationService;

    // Xem javadoc tương ứng ở TransportReportService — cùng lý do, cùng thiết kế.
    private void assertDepartmentAccess(Long targetDepartmentId) {
        AppUserDetails user = SecurityUtils.currentUser();
        if (user == null || !user.canAccessDepartment(targetDepartmentId)) {
            throw new ForbiddenException("Không có quyền truy cập dữ liệu Khai thác của đơn vị khác");
        }
    }

    /**
     * null = full-scope, KHÔNG lọc. Quality Gate lượt 3 của Codex
     * (2026-09-10) — sửa lỗi thật ở lượt trước: tài khoản null cũng được coi
     * là "không lọc" GIỐNG HỆT full-scope (bất kể lý do — chưa xác thực,
     * hay tài khoản scoped nhưng CHƯA GÁN đơn vị) khiến {@code getById} thì
     * fail-closed (chặn) trong khi {@code search}/{@code export} lại
     * fail-open (thấy hết) cho ĐÚNG những tài khoản đó — không nhất quán,
     * tạo đường vòng qua search/export để lách chặn ở getById. Giờ CHỈ
     * full-scope thật (đã xác thực + {@code hasFullDataScope()}) mới trả
     * null; mọi trường hợp khác — kể cả tài khoản scoped chưa gán đơn vị —
     * ném {@link ForbiddenException} NGAY, khớp đúng {@code assertDepartmentAccess}.
     */
    private Long currentScopeDepartmentId() {
        AppUserDetails user = SecurityUtils.currentUser();
        if (user == null) {
            throw new ForbiddenException("Không xác định được tài khoản đăng nhập");
        }
        if (user.hasFullDataScope()) {
            return null;
        }
        if (user.getDepartmentId() == null) {
            throw new ForbiddenException("Tài khoản chưa gán đơn vị — không có quyền xem dữ liệu Khai thác");
        }
        return user.getDepartmentId();
    }

    @Transactional
    public ExcavationReportResponse create(ExcavationReportRequest request) {
        ExcavationReport report = excavationReportMapper.toEntity(request);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        for (ExcavationReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        excavationReportRepository.save(report);
        reconciliationEventPublisher.publishChanged();
        return excavationReportMapper.toResponse(report);
    }

    @Transactional
    public ExcavationReportResponse update(Long id, ExcavationReportRequest request) {
        ExcavationReport report = excavationReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));

        // Xem chú thích ở TransportReportService.update — cùng lỗ hổng, cùng
        // cách sửa: xác minh đơn vị của máy xúc HIỆN TẠI (nguồn) trước khi
        // đụng gì tới report; xe/máy xúc ĐÍCH vẫn kiểm tra ở applyRelations.
        assertDepartmentAccess(report.getExcavatorDevice().getDepartment() != null
                ? report.getExcavatorDevice().getDepartment().getId() : null);

        excavationReportMapper.updateEntity(request, report);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        report.getTrips().clear();
        for (ExcavationReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        excavationReportRepository.save(report);
        reconciliationEventPublisher.publishChanged();
        return excavationReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public ExcavationReportResponse getById(Long id) {
        ExcavationReport report = excavationReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        assertDepartmentAccess(report.getExcavatorDevice().getDepartment() != null
                ? report.getExcavatorDevice().getDepartment().getId() : null);
        return excavationReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public PageResponse<ExcavationReportResponse> search(LocalDate fromDate, LocalDate toDate,
                                                             List<Long> shiftIds, List<Long> excavatorIds,
                                                             List<Long> receivingLocationIds,
                                                             List<String> excavationFloors,
                                                             Pageable pageable) {
        return PageResponse.from(excavationReportRepository
                .search(fromDate, toDate, shiftIds, excavatorIds, receivingLocationIds, excavationFloors,
                        currentScopeDepartmentId(), pageable)
                .map(excavationReportMapper::toResponse));
    }

    /** Toàn bộ giá trị Tầng xúc trong khoảng ngày — xem javadoc repository. */
    @Transactional(readOnly = true)
    public List<String> getDistinctExcavationFloors(LocalDate fromDate, LocalDate toDate) {
        return excavationReportRepository.findDistinctExcavationFloors(fromDate, toDate, currentScopeDepartmentId());
    }

    /**
     * Dùng cho xuất Excel — trước đây {@code ExcavationReportController.export}
     * gọi THẲNG {@code excavationReportRepository.search(...)}, bỏ qua hoàn
     * toàn tầng Service (và giờ là cả lọc theo đơn vị). Thêm method này để
     * controller đi qua đúng 1 điểm chốt, không phải mở khoá phòng thủ ở một
     * nơi rồi vẫn còn hở cửa sau ở nơi khác.
     */
    @Transactional(readOnly = true)
    public List<ExcavationReport> findAllForExport(LocalDate fromDate, LocalDate toDate,
                                                    List<Long> shiftIds, List<Long> excavatorIds,
                                                    List<Long> receivingLocationIds,
                                                    List<String> excavationFloors) {
        return excavationReportRepository
                .search(fromDate, toDate, shiftIds, excavatorIds, receivingLocationIds, excavationFloors,
                        currentScopeDepartmentId(), Pageable.unpaged())
                .getContent();
    }

    @Transactional
    public void delete(Long id) {
        ExcavationReport report = excavationReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        assertDepartmentAccess(report.getExcavatorDevice().getDepartment() != null
                ? report.getExcavatorDevice().getDepartment().getId() : null);
        excavationReportRepository.delete(report);
        reconciliationEventPublisher.publishChanged();
    }

    private void applyRelations(ExcavationReport report, ExcavationReportRequest request) {
        report.setShift(getOrThrow(shiftRepository, request.getShiftId(), "Ca"));
        Device excavator = getOrThrow(deviceRepository, request.getExcavatorDeviceId(), "Máy xúc");
        assertDepartmentAccess(excavator.getDepartment() != null ? excavator.getDepartment().getId() : null);
        report.setExcavatorDevice(excavator);
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
        reports.forEach(r -> assertDepartmentAccess(
                r.getExcavatorDevice().getDepartment() != null ? r.getExcavatorDevice().getDepartment().getId() : null));
        excavationReportRepository.deleteAll(reports);
        reconciliationEventPublisher.publishChanged();
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
        assertDepartmentAccess(trip.getExcavationReport().getExcavatorDevice().getDepartment() != null
                ? trip.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null);
        ExcavationReportTripResponse response = excavationReportMapper.toTripResponse(trip);

        // Xem chú thích bên TransportReportService.getTrip — cùng lý do.
        if (trip.getStatus() == ApprovalStatus.REVISION_REQUESTED) {
            reconciliationDecisionRepository.findByExcavationReportTrip_Id(tripId)
                    .ifPresent(d -> response.setRevisionNote(d.getNote()));
        }
        return response;
    }

    @Transactional
    public ExcavationReportTripResponse updateTrip(Long tripId, ExcavationReportTripUpdateRequest request) {
        ExcavationReportTrip trip = excavationReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));
        assertDepartmentAccess(trip.getExcavationReport().getExcavatorDevice().getDepartment() != null
                ? trip.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null);
        if (request.getExcavatorDeviceId() != null) {
            Device targetExcavator = getOrThrow(deviceRepository, request.getExcavatorDeviceId(), "Máy xúc");
            assertDepartmentAccess(targetExcavator.getDepartment() != null
                    ? targetExcavator.getDepartment().getId() : null);
        }

        // Chốt 2026-09-09: chuyến đã duyệt đối chiếu không được sửa trực tiếp ở
        // nhập liệu nữa — phải để Thống kê gửi yêu cầu sửa (chuyển trạng thái
        // sang REVISION_REQUESTED) trước, mới được sửa + gửi lại.
        if (trip.getStatus() == ApprovalStatus.APPROVED) {
            throw new BadRequestException(
                    "Chuyến đã được duyệt đối chiếu — cần Thống kê gửi yêu cầu sửa trước khi được phép chỉnh sửa lại.");
        }

        updateTripFields(trip, request);
        moveTripToTargetReport(trip, request);
        trip.setStatus(ApprovalStatus.PENDING);
        excavationReportTripRepository.save(trip);

        // Sync reconciliation decision về PENDING
        reconciliationService.syncTripStatusToPending(trip.getId(), false);
        reconciliationEventPublisher.publishChanged();

        return excavationReportMapper.toTripResponse(trip);
    }

    /**
     * Bản đối xứng của {@code TransportReportService.moveTripToTargetReport} —
     * xem javadoc bên đó. Phiếu Khai thác định danh bằng (Ngày, Ca, Máy xúc,
     * Số thẻ lương); "Số xe" là trường cấp chuyến nên do
     * {@code updateTripFields} xử lý, không liên quan tới việc chuyển phiếu.
     */
    private void moveTripToTargetReport(ExcavationReportTrip trip, ExcavationReportTripUpdateRequest request) {
        ExcavationReport current = trip.getExcavationReport();

        LocalDate targetDate = request.getReportDate() != null
                ? request.getReportDate() : current.getReportDate();
        Long targetShiftId = request.getShiftId() != null
                ? request.getShiftId() : current.getShift().getId();
        Long targetExcavatorId = request.getExcavatorDeviceId() != null
                ? request.getExcavatorDeviceId() : current.getExcavatorDevice().getId();
        Long targetEmployeeId = request.getEmployeeId() != null
                ? request.getEmployeeId() : current.getEmployee().getId();

        boolean unchanged = targetDate.equals(current.getReportDate())
                && targetShiftId.equals(current.getShift().getId())
                && targetExcavatorId.equals(current.getExcavatorDevice().getId())
                && targetEmployeeId.equals(current.getEmployee().getId());
        if (unchanged) {
            return;
        }

        ExcavationReport target = excavationReportRepository
                .findByReportDateAndShiftIdAndExcavatorDeviceIdAndEmployeeId(
                        targetDate, targetShiftId, targetExcavatorId, targetEmployeeId)
                .orElseGet(() -> {
                    ExcavationReport created = new ExcavationReport();
                    created.setReportDate(targetDate);
                    created.setShift(shiftRepository.findById(targetShiftId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca: " + targetShiftId)));
                    created.setExcavatorDevice(deviceRepository.findById(targetExcavatorId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy máy xúc: " + targetExcavatorId)));
                    created.setEmployee(userRepository.findById(targetEmployeeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên: " + targetEmployeeId)));
                    created.setExcavationFloor(current.getExcavationFloor());
                    created.setReceivingLocation(current.getReceivingLocation());
                    created.setFuelBeginning(current.getFuelBeginning());
                    created.setFuelEnding(current.getFuelEnding());
                    created.setFuelReceived(current.getFuelReceived());
                    created.recalculateFuelUsed();
                    return excavationReportRepository.save(created);
                });

        current.getTrips().remove(trip);
        trip.setExcavationReport(target);
        target.getTrips().add(trip);
        excavationReportRepository.save(target);

        // Xem chú thích bên TransportReportService: flush khoá ngoại mới trước,
        // rồi mới xoá phiếu cũ nếu nó đã rỗng (tránh dòng rác khi xuất Excel và
        // nhiên liệu bị đếm hai lần).
        excavationReportTripRepository.saveAndFlush(trip);
        if (current.getTrips().isEmpty()) {
            excavationReportRepository.delete(current);
        }
    }

    @Transactional
    public void deleteTrip(Long tripId) {
        ExcavationReportTrip trip = excavationReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));
        assertDepartmentAccess(trip.getExcavationReport().getExcavatorDevice().getDepartment() != null
                ? trip.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null);

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
        reconciliationEventPublisher.publishChanged();
    }

    @Transactional
    public List<ExcavationReportTripResponse> bulkUpdateTrips(List<ExcavationTripBulkUpdateItem> items) {
        List<ExcavationReportTripResponse> results = new ArrayList<>();
        for (ExcavationTripBulkUpdateItem item : items) {
            ExcavationReportTrip trip = excavationReportTripRepository.findById(item.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + item.getId()));
            assertDepartmentAccess(trip.getExcavationReport().getExcavatorDevice().getDepartment() != null
                    ? trip.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null);

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
        reconciliationEventPublisher.publishChanged();
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
        trips.forEach(t -> assertDepartmentAccess(t.getExcavationReport().getExcavatorDevice().getDepartment() != null
                ? t.getExcavationReport().getExcavatorDevice().getDepartment().getId() : null));

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

        reconciliationEventPublisher.publishChanged();
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
