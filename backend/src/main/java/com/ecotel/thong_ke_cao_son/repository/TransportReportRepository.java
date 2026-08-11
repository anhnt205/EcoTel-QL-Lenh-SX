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
    SELECT r FROM TransportReport r
    WHERE r.reportDate BETWEEN :fromDate AND :toDate
      AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
      AND (:deviceIds IS NULL OR r.device.id IN :deviceIds)
    ORDER BY r.reportDate DESC
    """)
    Page<TransportReport> search(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds,
            Pageable pageable);

    Optional<TransportReport> findByReportDateAndShiftIdAndDeviceIdAndEmployeeId(
            LocalDate reportDate, Long shiftId, Long deviceId, Long employeeId);
}
