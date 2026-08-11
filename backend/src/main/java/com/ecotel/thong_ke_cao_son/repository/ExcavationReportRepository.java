package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExcavationReportRepository extends JpaRepository<ExcavationReport, Long> {

    @Query("""
        SELECT r FROM ExcavationReport r
        WHERE r.reportDate BETWEEN :fromDate AND :toDate
          AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
          AND (:excavatorIds IS NULL OR r.excavatorDevice.id IN :excavatorIds)
        ORDER BY r.reportDate DESC
        """)
    Page<ExcavationReport> search(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("excavatorIds") List<Long> excavatorIds,
            Pageable pageable);

    Optional<ExcavationReport> findByReportDateAndShiftIdAndExcavatorDeviceIdAndEmployeeId(
            LocalDate reportDate, Long shiftId, Long excavatorDeviceId, Long employeeId);
}
