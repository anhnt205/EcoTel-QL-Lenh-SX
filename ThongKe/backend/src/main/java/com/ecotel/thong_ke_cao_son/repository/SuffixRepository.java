package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Suffix;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SuffixRepository extends JpaRepository<Suffix, Long> {

    Optional<Suffix> findBySuffix(String suffix);

    boolean existsBySuffixAndIdNot(String suffix, Long id);

    @Query("""
        SELECT s FROM Suffix s
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(s.suffix) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(s.note) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<Suffix> search(@Param("keyword") String keyword, Pageable pageable);
}
