package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.enums.ReconciliationSide;
import com.ecotel.thong_ke_cao_son.model.ReconciliationDataHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReconciliationDataHistoryRepository extends JpaRepository<ReconciliationDataHistory, Long> {

    List<ReconciliationDataHistory> findByTripIdAndSideOrderByCreatedAtDesc(Long tripId, ReconciliationSide side);

    /** Batch 1 query cho cả trang tìm kiếm — tránh N+1 khi tính cờ "có lịch sử" cho mỗi dòng. */
    @Query("SELECT DISTINCT h.tripId FROM ReconciliationDataHistory h WHERE h.side = :side AND h.tripId IN :tripIds")
    List<Long> findDistinctTripIdBySideAndTripIdIn(@Param("side") ReconciliationSide side, @Param("tripIds") List<Long> tripIds);
}
