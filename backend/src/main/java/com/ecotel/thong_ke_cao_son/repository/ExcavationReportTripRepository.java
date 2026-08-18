package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ExcavationReportTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExcavationReportTripRepository extends JpaRepository<ExcavationReportTrip, Long> {

    @Query("""
            SELECT t FROM ExcavationReportTrip t
            JOIN FETCH t.excavationReport r
            JOIN FETCH r.shift
            JOIN FETCH r.vehicle
            JOIN FETCH r.excavatorDevice
            JOIN FETCH r.employee
            JOIN FETCH t.cargoType
            JOIN FETCH t.cargoGroup
            WHERE r.reportDate BETWEEN :fromDate AND :toDate
              AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
              AND (:deviceIds IS NULL OR r.vehicle.id IN :deviceIds)
            ORDER BY r.reportDate, t.id
            """)
    List<ExcavationReportTrip> findForReconciliation(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds);
}
