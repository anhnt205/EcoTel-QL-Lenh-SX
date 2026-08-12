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
        SELECT DISTINCT r.id FROM TransportReport r
        JOIN r.trips t
        WHERE r.reportDate BETWEEN :fromDate AND :toDate
          AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
          AND (:deviceIds IS NULL OR t.vehicle.id IN :deviceIds)
        ORDER BY r.reportDate DESC
        """)
    Page<Long> searchIds(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds,
            Pageable pageable);

    @Query("""
        SELECT r FROM TransportReport r
        JOIN FETCH r.shift
        JOIN FETCH r.employee
        WHERE r.id IN :ids
        ORDER BY r.reportDate DESC
        """)
    List<TransportReport> findAllByIdWithDetails(@Param("ids") List<Long> ids);

    Optional<TransportReport> findByReportDateAndShiftIdAndEmployeeId(
            LocalDate reportDate, Long shiftId, Long employeeId);


    @Query("""
    SELECT DISTINCT r.id FROM TransportReport r
    JOIN r.trips t
    WHERE r.reportDate BETWEEN :fromDate AND :toDate
      AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
      AND (:deviceIds IS NULL OR t.vehicle.id IN :deviceIds)
    ORDER BY r.reportDate DESC
    """)
    List<Long> searchAllIds(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds);
}
