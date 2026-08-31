package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.CargoGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CargoGroupRepository extends JpaRepository<CargoGroup, Long> {

    java.util.Optional<CargoGroup> findByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT cg FROM CargoGroup cg
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(cg.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(cg.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<CargoGroup> search(@Param("keyword") String keyword, Pageable pageable);
}
