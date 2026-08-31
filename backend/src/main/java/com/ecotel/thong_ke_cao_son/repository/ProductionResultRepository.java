package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ProductionResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductionResultRepository extends JpaRepository<ProductionResult, Long> {

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

    @Modifying
    @Query("DELETE FROM ProductionResult r WHERE r.reportPeriod.id = :periodId")
    int deleteByPeriod(@Param("periodId") Long periodId);
}
