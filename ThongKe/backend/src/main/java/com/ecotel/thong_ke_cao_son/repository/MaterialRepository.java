package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaterialRepository extends JpaRepository<Material, Long> {

    Optional<Material> findByMongoId(String mongoId);

    @Query("""
        SELECT m FROM Material m
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<Material> search(@Param("keyword") String keyword, Pageable pageable);
}
