package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ExcavatorBucket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExcavatorBucketRepository extends JpaRepository<ExcavatorBucket, Long> {

    Optional<ExcavatorBucket> findByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT b FROM ExcavatorBucket b
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<ExcavatorBucket> search(@Param("keyword") String keyword, Pageable pageable);
}
