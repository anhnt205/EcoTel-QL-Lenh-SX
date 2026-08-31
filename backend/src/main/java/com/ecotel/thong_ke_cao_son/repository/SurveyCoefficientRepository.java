package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.SurveyCoefficient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyCoefficientRepository extends JpaRepository<SurveyCoefficient, Long> {

    List<SurveyCoefficient> findByReportPeriodIdAndKind(Long reportPeriodId, SurveyCoefficient.Kind kind);

    List<SurveyCoefficient> findByReportPeriodIdOrderBySeamGroupExcavatorKeyAsc(Long reportPeriodId);

    @Modifying
    @Query("DELETE FROM SurveyCoefficient c WHERE c.reportPeriod.id = :periodId")
    int deleteByPeriod(@Param("periodId") Long periodId);
}
