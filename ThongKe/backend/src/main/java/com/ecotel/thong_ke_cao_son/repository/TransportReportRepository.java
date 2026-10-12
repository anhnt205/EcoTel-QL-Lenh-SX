package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.TransportReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransportReportRepository extends JpaRepository<TransportReport, Long> {

    // `:departmentId` NULL = tài khoản full-scope, không lọc. Tài khoản
    // scoped luôn có departmentId thật (currentScopeDepartmentId() ở
    // TransportReportService fail-closed trước khi gọi query này nếu tài
    // khoản chưa gán đơn vị) — CỐ Ý KHÔNG có `OR r.vehicle.department.id IS
    // NULL` (đã bỏ qua Quality Gate lượt 3 của Codex, 2026-09-10): xe chưa
    // gán đơn vị bị "cách ly" khỏi mọi tài khoản scoped, chỉ full-scope mới
    // thấy — xem javadoc AppUserDetails.canAccessDepartment.
    @Query("""
    SELECT r.id FROM TransportReport r
    WHERE r.reportDate BETWEEN :fromDate AND :toDate
      AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
      AND (:deviceIds IS NULL OR r.vehicle.id IN :deviceIds)
      AND (:departmentId IS NULL OR r.vehicle.department.id = :departmentId)
    ORDER BY r.reportDate DESC
    """)
    Page<Long> searchIds(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds,
            @Param("departmentId") Long departmentId,
            Pageable pageable);

    @Query("""
        SELECT r FROM TransportReport r
        JOIN FETCH r.shift
        JOIN FETCH r.employee
        JOIN FETCH r.vehicle
        WHERE r.id IN :ids
        ORDER BY r.reportDate DESC
        """)
    List<TransportReport> findAllByIdWithDetails(@Param("ids") List<Long> ids);

    Optional<TransportReport> findByReportDateAndShiftIdAndVehicleIdAndEmployeeId(
            LocalDate reportDate, Long shiftId, Long vehicleId, Long employeeId);


    @Query("""
    SELECT r.id FROM TransportReport r
    WHERE r.reportDate BETWEEN :fromDate AND :toDate
      AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
      AND (:deviceIds IS NULL OR r.vehicle.id IN :deviceIds)
      AND (:departmentId IS NULL OR r.vehicle.department.id = :departmentId)
    ORDER BY r.reportDate DESC
    """)
    List<Long> searchAllIds(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds,
            @Param("departmentId") Long departmentId);
}
