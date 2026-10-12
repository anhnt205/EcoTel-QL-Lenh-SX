package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TransportReportTripUpdateRequest;
import com.ecotel.thong_ke_cao_son.dto.request.TripBulkUpdateItem;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportResponse;
import com.ecotel.thong_ke_cao_son.dto.response.TransportReportTripResponse;
import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ForbiddenException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.security.AppUserDetails;
import com.ecotel.thong_ke_cao_son.security.SecurityUtils;
import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import com.ecotel.thong_ke_cao_son.model.ReceivingPoint;
import com.ecotel.thong_ke_cao_son.repository.UnloadingPointRepository;
import com.ecotel.thong_ke_cao_son.model.UnloadingPoint;
import com.ecotel.thong_ke_cao_son.repository.ExcavationAreaRepository;
import com.ecotel.thong_ke_cao_son.repository.ReceivingPointRepository;
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
    private final ReconciliationDecisionRepository reconciliationDecisionRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final ExcavationAreaRepository excavationAreaRepository;
    private final ReceivingPointRepository receivingPointRepository;
    private final UnloadingPointRepository unloadingPointRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ReceivingFloorGroupCalculator floorGroupCalculator;
    private final TransportReportMapper transportReportMapper;
    private final ReconciliationEventPublisher reconciliationEventPublisher;
    @Lazy
    private final ReconciliationService reconciliationService;

    // ============ Phân quyền DỮ LIỆU theo đơn vị (Quality Gate lượt 2, 2026-09-10) ============
    //
    // Khác "permissions" (CRUD theo CHỨC NĂNG, đã có từ trước) — đây là lọc/
    // xác minh theo ĐƠN VỊ (Device.department của Số xe): tài khoản có đủ
    // quyền chức năng "transport-reports" vẫn KHÔNG được đọc/sửa/xoá báo cáo
    // của xe thuộc đơn vị khác qua API trực tiếp, trừ khi đơn vị của tài
    // khoản đó được đánh dấu "thấy toàn bộ" (Department.fullDataScope). Xem
    // AppUserDetails.canAccessDepartment.

    /** Chặn CỨNG (fail-closed) — dùng cho các thao tác đọc/sửa/xoá TRỰC TIẾP theo id (đúng lỗ hổng Codex nêu). */
    private void assertDepartmentAccess(Long targetDepartmentId) {
        AppUserDetails user = SecurityUtils.currentUser();
        if (user == null || !user.canAccessDepartment(targetDepartmentId)) {
            throw new ForbiddenException("Không có quyền truy cập dữ liệu Vận tải của đơn vị khác");
        }
    }

    /**
     * null = full-scope thật, KHÔNG lọc. Quality Gate lượt 3 của Codex
     * (2026-09-10) — sửa lỗi thật ở lượt trước: trước đây user null hoặc
     * scoped-nhưng-chưa-gán-đơn-vị cũng trả null giống full-scope, khiến
     * {@code getById} fail-closed (chặn) trong khi {@code search}/
     * {@code export} lại fail-open (thấy hết) cho ĐÚNG những tài khoản đó —
     * tạo đường vòng qua search/export để lách chặn ở getById. Giờ CHỈ
     * full-scope thật mới trả null; mọi trường hợp khác ném
     * {@link ForbiddenException} NGAY, khớp đúng {@code assertDepartmentAccess}.
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
            throw new ForbiddenException("Tài khoản chưa gán đơn vị — không có quyền xem dữ liệu Vận tải");
        }
        return user.getDepartmentId();
    }

    @Transactional
    public TransportReportResponse create(TransportReportRequest request) {
        TransportReport report = transportReportMapper.toEntity(request);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        for (TransportReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        transportReportRepository.save(report);
        reconciliationEventPublisher.publishChanged();
        return transportReportMapper.toResponse(report);
    }

    @Transactional
    public TransportReportResponse update(Long id, TransportReportRequest request) {
        TransportReport report = transportReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));

        // Xác minh đơn vị của xe HIỆN TẠI (nguồn) NGAY SAU KHI load, TRƯỚC bất
        // kỳ mutation nào (Quality Gate lượt 4 của Codex, 2026-09-15) — lỗ
        // hổng thật: trước đây chỉ `applyRelations` kiểm tra xe ĐÍCH (xe mới
        // trong request), không hề kiểm tra xe NGUỒN (report đang có sẵn) —
        // tài khoản đơn vị A biết id báo cáo của đơn vị B vẫn update được
        // (miễn gửi vehicleId thuộc đơn vị A, xe ĐÍCH hợp lệ) — chiếm đoạt
        // báo cáo B sang A, đổi toàn bộ dữ liệu/chuyến. Kiểm tra CẢ HAI: xe
        // nguồn ở đây, xe đích vẫn ở applyRelations như cũ (không đổi).
        assertDepartmentAccess(report.getVehicle().getDepartment() != null
                ? report.getVehicle().getDepartment().getId() : null);

        transportReportMapper.updateEntity(request, report);
        applyRelations(report, request);
        report.recalculateFuelUsed();

        // Replace toàn bộ trips cũ — orphanRemoval=true tự xóa trip cũ khi flush
        report.getTrips().clear();
        for (TransportReportTripRequest tripReq : request.getTrips()) {
            report.getTrips().add(buildTrip(report, tripReq));
        }

        transportReportRepository.save(report);
        reconciliationEventPublisher.publishChanged();
        return transportReportMapper.toResponse(report);
    }

    @Transactional(readOnly = true)
    public TransportReportResponse getById(Long id) {
        TransportReport report = transportReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        assertDepartmentAccess(report.getVehicle().getDepartment() != null
                ? report.getVehicle().getDepartment().getId() : null);
        return transportReportMapper.toResponse(report);
    }

    // TransportReportService.search() — cập nhật để dùng 2 bước
    @Transactional(readOnly = true)
    public PageResponse<TransportReportResponse> search(LocalDate fromDate, LocalDate toDate,
                                                       List<Long> shiftIds, List<Long> deviceIds,
                                                       Pageable pageable) {
        Page<Long> idPage = transportReportRepository.searchIds(
                fromDate, toDate, shiftIds, deviceIds, currentScopeDepartmentId(), pageable);
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
        List<Long> ids = transportReportRepository.searchAllIds(
                fromDate, toDate, shiftIds, deviceIds, currentScopeDepartmentId());
        return transportReportRepository.findAllByIdWithDetails(ids);
    }

    @Transactional
    public void delete(Long id) {
        TransportReport report = transportReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + id));
        assertDepartmentAccess(report.getVehicle().getDepartment() != null
                ? report.getVehicle().getDepartment().getId() : null);
        transportReportRepository.delete(report);
        reconciliationEventPublisher.publishChanged();
    }

    // ============ Phần resolve quan hệ — không thuộc trách nhiệm của Mapper ============

    private void applyRelations(TransportReport report, TransportReportRequest request) {
        report.setShift(getOrThrow(shiftRepository, request.getShiftId(), "Ca"));
        Device vehicle = getOrThrow(deviceRepository, request.getVehicleId(), "Số xe");
        assertDepartmentAccess(vehicle.getDepartment() != null ? vehicle.getDepartment().getId() : null);
        report.setVehicle(vehicle);
        report.setEmployee(getOrThrow(userRepository, request.getEmployeeId(), "Nhân viên"));
    }

    private TransportReportTrip buildTrip(TransportReport report, TransportReportTripRequest tripReq) {
        TransportReportTrip trip = transportReportMapper.toTripEntity(tripReq);
        trip.setTransportReport(report);

        trip.setRainyDay(tripReq.getRainyDay() != null ? tripReq.getRainyDay() : false);
        trip.setSupplementaryVehicle(tripReq.getSupplementaryVehicle() != null ? tripReq.getSupplementaryVehicle() : false);

        ExcavationArea excavationArea = getOrThrow(excavationAreaRepository, tripReq.getExcavationAreaId(), "Khu vực xúc");
        trip.setExcavationArea(excavationArea);
        trip.setExcavator(getOrThrow(deviceRepository, tripReq.getExcavatorDeviceId(), "Máy xúc"));
        trip.setLoadingPoint(getOrThrow(receivingPointRepository, tripReq.getLoadingPointId(), "Nơi nhận tải"));
        trip.setUnloadingPoint(getOrThrow(unloadingPointRepository, tripReq.getUnloadingPointId(), "Nơi dỡ tải"));

        CargoType cargoType = getOrThrow(cargoTypeRepository, tripReq.getCargoTypeId(), "Loại hàng");
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup());

        trip.setReceivingFloorGroup(
                floorGroupCalculator.calculate(excavationArea, tripReq.getReceivingFloor()));

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
        reports.forEach(r -> assertDepartmentAccess(
                r.getVehicle().getDepartment() != null ? r.getVehicle().getDepartment().getId() : null));
        transportReportRepository.deleteAll(reports);
        reconciliationEventPublisher.publishChanged();
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
        assertDepartmentAccess(trip.getTransportReport().getVehicle().getDepartment() != null
                ? trip.getTransportReport().getVehicle().getDepartment().getId() : null);
        TransportReportTripResponse response = transportReportMapper.toTripResponse(trip);

        // Chuyến đang bị yêu cầu sửa thì kèm luôn ghi chú Thống kê đã gửi, để
        // form sửa chuyến hiện ngay lý do — trước đây đơn vị phải quay lại màn
        // Đối chiếu mới đọc được. Chốt 2026-09-09.
        if (trip.getStatus() == ApprovalStatus.REVISION_REQUESTED) {
            reconciliationDecisionRepository.findByTransportReportTrip_Id(tripId)
                    .ifPresent(d -> response.setRevisionNote(d.getNote()));
        }
        return response;
    }

    @Transactional
    public TransportReportTripResponse updateTrip(Long tripId, TransportReportTripUpdateRequest request) {
        TransportReportTrip trip = transportReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));
        assertDepartmentAccess(trip.getTransportReport().getVehicle().getDepartment() != null
                ? trip.getTransportReport().getVehicle().getDepartment().getId() : null);
        // Đổi sang Số xe khác (nếu có) — xác minh luôn đơn vị của xe ĐÍCH,
        // không chỉ xe hiện tại, tránh "chuyển chuyến" thành cách lách qua
        // đơn vị khác.
        if (request.getVehicleId() != null) {
            Device targetVehicle = getOrThrow(deviceRepository, request.getVehicleId(), "Số xe");
            assertDepartmentAccess(targetVehicle.getDepartment() != null
                    ? targetVehicle.getDepartment().getId() : null);
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
        transportReportTripRepository.save(trip);

        // Sync reconciliation decision về PENDING
        reconciliationService.syncTripStatusToPending(trip.getId(), true);
        reconciliationEventPublisher.publishChanged();

        return transportReportMapper.toTripResponse(trip);
    }

    /**
     * Chuyển chuyến sang phiếu khác khi người dùng đổi Ngày/Ca/Số xe/Số thẻ
     * lương ở form sửa chuyến. Bốn trường đó thuộc PHIẾU chứ không thuộc chuyến,
     * nên không thể "sửa tại chỗ" — phải tìm phiếu đích đúng bộ khoá (chưa có
     * thì tạo mới, chép lại số liệu nhiên liệu của phiếu cũ) rồi chuyển chuyến
     * sang. Bỏ trống trường nào thì giữ nguyên giá trị hiện tại của trường đó.
     *
     * <p>Chuyển xong mà phiếu cũ không còn chuyến nào thì XOÁ phiếu cũ — đúng
     * như {@code deleteTrip} vẫn làm khi xoá chuyến cuối cùng của một phiếu.
     * Không xoá thì phiếu rỗng vẫn hiện thành một dòng rác khi xuất Excel
     * ({@code TransportReportExcelExporter} cố ý ghi 1 dòng cho phiếu không có
     * chuyến), kèm theo số liệu nhiên liệu đã được chép sang phiếu mới nên bị
     * đếm hai lần.
     */
    private void moveTripToTargetReport(TransportReportTrip trip, TransportReportTripUpdateRequest request) {
        TransportReport current = trip.getTransportReport();

        LocalDate targetDate = request.getReportDate() != null
                ? request.getReportDate() : current.getReportDate();
        Long targetShiftId = request.getShiftId() != null
                ? request.getShiftId() : current.getShift().getId();
        Long targetVehicleId = request.getVehicleId() != null
                ? request.getVehicleId() : current.getVehicle().getId();
        Long targetEmployeeId = request.getEmployeeId() != null
                ? request.getEmployeeId() : current.getEmployee().getId();

        boolean unchanged = targetDate.equals(current.getReportDate())
                && targetShiftId.equals(current.getShift().getId())
                && targetVehicleId.equals(current.getVehicle().getId())
                && targetEmployeeId.equals(current.getEmployee().getId());
        if (unchanged) {
            return;
        }

        TransportReport target = transportReportRepository
                .findByReportDateAndShiftIdAndVehicleIdAndEmployeeId(
                        targetDate, targetShiftId, targetVehicleId, targetEmployeeId)
                .orElseGet(() -> {
                    TransportReport created = new TransportReport();
                    created.setReportDate(targetDate);
                    created.setShift(shiftRepository.findById(targetShiftId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca: " + targetShiftId)));
                    created.setVehicle(deviceRepository.findById(targetVehicleId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy xe: " + targetVehicleId)));
                    created.setEmployee(userRepository.findById(targetEmployeeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên: " + targetEmployeeId)));
                    created.setFuelBeginning(current.getFuelBeginning());
                    created.setFuelEnding(current.getFuelEnding());
                    created.setFuelReceived(current.getFuelReceived());
                    created.recalculateFuelUsed();
                    return transportReportRepository.save(created);
                });

        current.getTrips().remove(trip);
        trip.setTransportReport(target);
        target.getTrips().add(trip);
        transportReportRepository.save(target);

        // Đẩy khoá ngoại mới của chuyến xuống DB TRƯỚC khi xoá phiếu cũ, nếu
        // không sẽ vi phạm ràng buộc khoá ngoại lúc flush.
        transportReportTripRepository.saveAndFlush(trip);
        if (current.getTrips().isEmpty()) {
            transportReportRepository.delete(current);
        }
    }

    @Transactional
    public void deleteTrip(Long tripId) {
        TransportReportTrip trip = transportReportTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + tripId));
        assertDepartmentAccess(trip.getTransportReport().getVehicle().getDepartment() != null
                ? trip.getTransportReport().getVehicle().getDepartment().getId() : null);

        // Xóa reconciliation decision liên quan trước
        reconciliationDecisionRepository.findByTransportReportTrip_Id(tripId)
                .ifPresent(reconciliationDecisionRepository::delete);

        TransportReport report = trip.getTransportReport();
        report.getTrips().remove(trip);

        if (report.getTrips().isEmpty()) {
            transportReportRepository.delete(report);
        } else {
            transportReportRepository.save(report);
        }
        reconciliationEventPublisher.publishChanged();
    }

    @Transactional
    public List<TransportReportTripResponse> bulkUpdateTrips(List<TripBulkUpdateItem> items) {
        List<TransportReportTripResponse> results = new ArrayList<>();
        for (TripBulkUpdateItem item : items) {
            TransportReportTrip trip = transportReportTripRepository.findById(item.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến: " + item.getId()));
            assertDepartmentAccess(trip.getTransportReport().getVehicle().getDepartment() != null
                    ? trip.getTransportReport().getVehicle().getDepartment().getId() : null);

            if (trip.getStatus() == ApprovalStatus.APPROVED) {
                throw new BadRequestException(
                        "Chuyến #" + item.getId() + " đã được duyệt đối chiếu — cần Thống kê gửi yêu cầu sửa trước khi được phép chỉnh sửa lại.");
            }

            updateTripFields(trip, item.getData());
            trip.setStatus(ApprovalStatus.PENDING);
            results.add(transportReportMapper.toTripResponse(trip));

            // Sync reconciliation decision về PENDING
            reconciliationService.syncTripStatusToPending(trip.getId(), true);
        }

        transportReportTripRepository.saveAll(results.stream()
                .map(r -> transportReportTripRepository.findById(r.getId()).orElseThrow())
                .toList());
        reconciliationEventPublisher.publishChanged();
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
        trips.forEach(t -> assertDepartmentAccess(t.getTransportReport().getVehicle().getDepartment() != null
                ? t.getTransportReport().getVehicle().getDepartment().getId() : null));

        // Xóa reconciliation decisions liên quan trước
        reconciliationDecisionRepository.findByTransportReportTrip_IdIn(tripIds)
                .forEach(reconciliationDecisionRepository::delete);

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

        reconciliationEventPublisher.publishChanged();
        return BulkDeleteResponse.builder()
                .requestedCount(tripIds.size())
                .deletedCount(trips.size())
                .build();
    }

    private void updateTripFields(TransportReportTrip trip, TransportReportTripRequest request) {
        trip.setRainyDay(request.getRainyDay() != null ? request.getRainyDay() : false);
        trip.setSupplementaryVehicle(request.getSupplementaryVehicle() != null ? request.getSupplementaryVehicle() : false);

        trip.setExcavationArea(getOrThrow(excavationAreaRepository, request.getExcavationAreaId(), "Khu vực xúc"));
        trip.setExcavator(getOrThrow(deviceRepository, request.getExcavatorDeviceId(), "Máy xúc"));
        trip.setLoadingPoint(getOrThrow(receivingPointRepository, request.getLoadingPointId(), "Nơi nhận tải"));
        trip.setUnloadingPoint(getOrThrow(unloadingPointRepository, request.getUnloadingPointId(), "Nơi dỡ tải"));

        trip.setReceivingFloor(request.getReceivingFloor());
        trip.setReceivingFloorGroup(floorGroupCalculator.calculate(trip.getExcavationArea(), request.getReceivingFloor()));
        trip.setUnloadingFloor(request.getUnloadingFloor());
        trip.setTotalRouteDistanceKm(request.getTotalRouteDistanceKm());
        trip.setTotalRouteLiftM(request.getTotalRouteLiftM());
        trip.setLocalSlopeDistanceKm(request.getLocalSlopeDistanceKm());
        trip.setLocalSlopeM(request.getLocalSlopeM());

        CargoType cargoType = getOrThrow(cargoTypeRepository, request.getCargoTypeId(), "Loại hàng");
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup());

        trip.setTripCount(request.getTripCount());

        // Sáu trường "(Báo chuyến)" phục vụ tính sản lượng (B5). Ở nhánh TẠO
        // mới chúng được MapStruct tự ánh xạ; nhánh SỬA này viết tay nên phải
        // gán tường minh, nếu không sửa phiếu sẽ âm thầm xoá mất chúng.
        trip.setWeighedWeightTon(request.getWeighedWeightTon());
        trip.setProvisionalModel(request.getProvisionalModel());
        trip.setProvisionalDensity(request.getProvisionalDensity());
        trip.setCtnbDeviationCoefficient(request.getCtnbDeviationCoefficient());
        trip.setDeductionAmount(request.getDeductionAmount());
        trip.setWasteRockTon(request.getWasteRockTon());

        LoadLevel loadLevel = new LoadLevel();
        loadLevel.setType(request.getLoadLevelType());
        loadLevel.setCustomValue(
                request.getLoadLevelType() == LoadLevelType.OTHER ? request.getLoadLevelCustomValue() : null);
        trip.setLoadLevel(loadLevel);
    }
}
