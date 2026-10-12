package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.SurveyStandard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyStandardRepository extends JpaRepository<SurveyStandard, Long> {

    @Query("""
        SELECT s FROM SurveyStandard s
        WHERE (:catalogType IS NULL OR s.catalogType = :catalogType)
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(s.seamGroupExcavatorKey) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(s.earthAcceptanceProduct, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(s.coalAcceptanceProduct, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<SurveyStandard> search(@Param("catalogType") SurveyStandard.CatalogType catalogType,
                                @Param("keyword") String keyword,
                                Pageable pageable);

    /** Chồng khoảng hiệu lực trên cùng một {@code (catalogType, khoá)}. */
    @Query("""
        SELECT s FROM SurveyStandard s
        WHERE s.catalogType = :catalogType
          AND s.seamGroupExcavatorKey = :key
          AND s.effectiveFrom <= :toDate
          AND s.effectiveTo   >= :fromDate
          AND (:selfId IS NULL OR s.id <> :selfId)
        """)
    List<SurveyStandard> findOverlapping(
            @Param("catalogType") SurveyStandard.CatalogType catalogType,
            @Param("key") String key,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("selfId") Long selfId);

    @Query("""
        SELECT s FROM SurveyStandard s
        WHERE s.catalogType = :catalogType
          AND s.seamGroupExcavatorKey = :key
          AND s.effectiveFrom <= :date
          AND s.effectiveTo   >= :date
        """)
    Optional<SurveyStandard> findEffective(
            @Param("catalogType") SurveyStandard.CatalogType catalogType,
            @Param("key") String key,
            @Param("date") LocalDate date);

    /** Các khoá đã khai báo — dùng cho gợi ý khi nhập dòng mới. */
    @Query("""
        SELECT DISTINCT s.seamGroupExcavatorKey FROM SurveyStandard s
        ORDER BY s.seamGroupExcavatorKey
        """)
    List<String> findDistinctKeys();

    /** Tra "Máy xúc" hiển thị theo khoá — dùng cho báo cáo Áp Trắc Địa. */
    List<SurveyStandard> findBySeamGroupExcavatorKeyIn(List<String> keys);
}
