package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExcavationAreaRepository extends JpaRepository<ExcavationArea, Long> {

    Optional<ExcavationArea> findByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT a FROM ExcavationArea a
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(a.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<ExcavationArea> search(@Param("keyword") String keyword, Pageable pageable);
}
