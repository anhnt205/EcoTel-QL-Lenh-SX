package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.WasteRockCoefficient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WasteRockCoefficientRepository extends JpaRepository<WasteRockCoefficient, Long> {

    /** Hệ số của khu vực xúc có khoảng thời gian chứa ngày đầu tháng {@code monthStart}. */
    @Query("""
        SELECT c FROM WasteRockCoefficient c
        WHERE c.excavationArea.id = :areaId
          AND c.effectiveFrom <= :monthStart AND c.effectiveTo >= :monthStart
        ORDER BY c.effectiveFrom DESC
        """)
    List<WasteRockCoefficient> findCovering(@Param("areaId") Long areaId, @Param("monthStart") LocalDate monthStart);

    default Optional<WasteRockCoefficient> findFirstCovering(Long areaId, LocalDate monthStart) {
        return findCovering(areaId, monthStart).stream().findFirst();
    }

    /** Các dòng CÙNG khu vực xúc có khoảng thời gian chồng lấn [from, to], loại trừ {@code excludeId} (null = không loại trừ). */
    @Query("""
        SELECT c FROM WasteRockCoefficient c
        WHERE c.excavationArea.id = :areaId
          AND c.effectiveFrom <= :to AND c.effectiveTo >= :from
          AND (:excludeId IS NULL OR c.id <> :excludeId)
        """)
    List<WasteRockCoefficient> findOverlapping(@Param("areaId") Long areaId, @Param("from") LocalDate from,
                                               @Param("to") LocalDate to, @Param("excludeId") Long excludeId);

    boolean existsByExcavationArea_IdIn(java.util.Collection<Long> areaIds);
}
