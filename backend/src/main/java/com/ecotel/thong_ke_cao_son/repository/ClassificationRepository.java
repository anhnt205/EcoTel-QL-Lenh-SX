package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Classification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClassificationRepository extends JpaRepository<Classification, Long> {

    Optional<Classification> findByCode(String code);

    /** Dùng khi nhập Excel — file chỉ có TÊN, không có id. */
    Optional<Classification> findByName(String name);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT c FROM Classification c
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<Classification> search(@Param("keyword") String keyword, Pageable pageable);
}
