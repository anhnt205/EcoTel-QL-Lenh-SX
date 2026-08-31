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

    /**
     * Toàn bộ chuyến trong một khoảng ngày — đầu vào của engine tính sản lượng.
     *
     * <p>Nạp sẵn (JOIN FETCH) mọi quan hệ mà công thức đụng tới. Không nạp sẵn
     * thì mỗi chuyến sinh thêm cả chục truy vấn con; một kỳ vài nghìn chuyến
     * sẽ thành hàng chục nghìn truy vấn.
     *
     * <p>{@code LEFT JOIN} với {@code vehicle} và {@code cargoGroup} vì thiếu
     * chúng là lỗi nghiệp vụ cần báo rõ, không phải lý do để bỏ sót chuyến
     * khỏi kết quả tính.
     */
    @Query("""
        SELECT t FROM TransportReportTrip t
        JOIN FETCH t.transportReport r
        LEFT JOIN FETCH r.vehicle v
        LEFT JOIN FETCH v.fuelClass
        LEFT JOIN FETCH t.excavationArea
        LEFT JOIN FETCH t.excavator
        LEFT JOIN FETCH t.loadingPoint
        LEFT JOIN FETCH t.unloadingPoint
        LEFT JOIN FETCH t.cargoType ct
        LEFT JOIN FETCH ct.cargoGroup
        WHERE r.reportDate BETWEEN :fromDate AND :toDate
        ORDER BY r.reportDate, t.id
        """)
    List<TransportReportTrip> findByReportDateBetween(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
