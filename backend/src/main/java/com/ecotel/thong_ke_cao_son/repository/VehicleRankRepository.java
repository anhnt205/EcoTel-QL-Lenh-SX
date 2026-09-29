package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.VehicleRank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRankRepository extends JpaRepository<VehicleRank, Long> {

    Optional<VehicleRank> findByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT r FROM VehicleRank r
        LEFT JOIN r.vehicleRankGroup g
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(r.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(g.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<VehicleRank> search(@Param("keyword") String keyword, Pageable pageable);
}
