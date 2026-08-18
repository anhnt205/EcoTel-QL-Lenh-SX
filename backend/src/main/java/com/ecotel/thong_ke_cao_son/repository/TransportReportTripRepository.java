package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TransportReportTripRepository extends JpaRepository<TransportReportTrip, Long> {

    @Query("""
        SELECT t FROM TransportReportTrip t
        JOIN FETCH t.transportReport r
        JOIN FETCH r.shift
        JOIN FETCH r.employee
        JOIN FETCH r.vehicle
        JOIN FETCH t.excavationArea
        JOIN FETCH t.excavator
        JOIN FETCH t.loadingPoint
        JOIN FETCH t.unloadingPoint
        JOIN FETCH t.cargoType
        WHERE r.reportDate BETWEEN :fromDate AND :toDate
          AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
          AND (:deviceIds IS NULL OR r.vehicle.id IN :deviceIds)
        """)
    List<TransportReportTrip> findForReconciliation(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("deviceIds") List<Long> deviceIds);
}
