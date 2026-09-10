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

    @Query("""
    SELECT r.id FROM TransportReport r
    WHERE r.reportDate BETWEEN :fromDate AND :toDate
      AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
      AND (:deviceIds IS NULL OR r.vehicle.id IN :deviceIds)
      AND (:departmentId IS NULL OR r.vehicle.department.id = :departmentId OR r.vehicle.department.id IS NULL)
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
      AND (:departmentId IS NULL OR r.vehicle.department.id = :departmentId OR r.vehicle.department.id IS NULL)
    ORDER BY r.reportDate DESC
    """)
    List<Long> searchAllIds(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds,
            @Param("departmentId") Long departmentId);
}
