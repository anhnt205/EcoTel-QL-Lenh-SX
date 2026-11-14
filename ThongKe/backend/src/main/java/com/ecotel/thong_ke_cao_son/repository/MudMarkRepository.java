package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.MudMark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MudMarkRepository extends JpaRepository<MudMark, Long> {

    Optional<MudMark> findByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    @Query("""
        SELECT s FROM MudMark s
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(s.note) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<MudMark> search(@Param("keyword") String keyword, Pageable pageable);
}
