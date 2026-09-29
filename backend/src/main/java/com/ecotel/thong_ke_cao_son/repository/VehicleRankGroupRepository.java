package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.VehicleRankGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRankGroupRepository extends JpaRepository<VehicleRankGroup, Long> {

    Optional<VehicleRankGroup> findByCode(String code);

    /** Dùng khi nhập Excel — file chỉ có TÊN, không có id. */
    Optional<VehicleRankGroup> findByName(String name);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT g FROM VehicleRankGroup g
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(g.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<VehicleRankGroup> search(@Param("keyword") String keyword, Pageable pageable);
}
