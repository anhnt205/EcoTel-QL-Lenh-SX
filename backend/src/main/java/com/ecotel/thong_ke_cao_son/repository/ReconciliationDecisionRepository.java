package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ReconciliationDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReconciliationDecisionRepository extends JpaRepository<ReconciliationDecision, Long> {
    Optional<ReconciliationDecision> findByTransportReportTrip_Id(Long transportReportTripId);
    Optional<ReconciliationDecision> findByExcavationReportTrip_Id(Long excavationReportTripId);

    List<ReconciliationDecision> findByTransportReportTrip_IdIn(List<Long> transportReportTripIds);
    List<ReconciliationDecision> findByExcavationReportTrip_IdIn(List<Long> excavationReportTripIds);
}
