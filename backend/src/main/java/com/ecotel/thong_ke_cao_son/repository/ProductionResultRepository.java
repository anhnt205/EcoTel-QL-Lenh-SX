package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ProductionResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionResultRepository extends JpaRepository<ProductionResult, Long> {

    /**
     * 1 dòng bất kỳ của kỳ — chỉ để đọc {@code tkeMode} đang áp dụng (mọi
     * dòng cùng kỳ luôn cùng chế độ, xem javadoc {@code ReportPeriod}). Dùng
     * khi tự động tính lại (không có người dùng bấm nút chọn chế độ) —
     * {@code ProductionAutoRecalculateListener}.
     */
    Optional<ProductionResult> findFirstByReportPeriod_Id(Long periodId);

    @Query("""
        SELECT r FROM ProductionResult r
        WHERE r.reportPeriod.id = :periodId
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(r.seamGroupExcavatorKey) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.acceptanceProduct, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<ProductionResult> search(@Param("periodId") Long periodId,
                                  @Param("keyword") String keyword,
                                  Pageable pageable);

    /**
     * Toàn bộ dòng của một kỳ, nạp sẵn ngữ cảnh chuyến.
     *
     * <p>Màn báo cáo hiện tên xe / máy xúc / khu vực chứ không hiện id, nên
     * không JOIN FETCH thì mỗi dòng sinh thêm cả chục truy vấn con.
     */
    @Query("""
        SELECT r FROM ProductionResult r
        JOIN FETCH r.transportTrip t
        JOIN FETCH t.transportReport rep
        LEFT JOIN FETCH rep.shift
        LEFT JOIN FETCH rep.vehicle
        LEFT JOIN FETCH t.excavator
        LEFT JOIN FETCH t.excavationArea
        LEFT JOIN FETCH t.loadingPoint
        LEFT JOIN FETCH t.unloadingPoint
        LEFT JOIN FETCH t.cargoType
        LEFT JOIN FETCH t.cargoGroup
        WHERE r.reportPeriod.id = :periodId
        ORDER BY r.productionDate, r.id
        """)
    List<ProductionResult> findAllByPeriod(@Param("periodId") Long periodId);

    @Modifying
    @Query("DELETE FROM ProductionResult r WHERE r.reportPeriod.id = :periodId")
    int deleteByPeriod(@Param("periodId") Long periodId);
}
