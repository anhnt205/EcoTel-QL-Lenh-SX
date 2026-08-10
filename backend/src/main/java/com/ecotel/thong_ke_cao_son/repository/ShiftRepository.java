package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {

    Optional<Shift> findByMongoId(String mongoId);
    @Query("""
        SELECT s FROM Shift s
        WHERE :keyword IS NULL OR :keyword = ''
           OR CAST(s.name AS string) LIKE CONCAT('%', :keyword, '%')
           OR LOWER(s.startTime) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(s.endTime) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<Shift> search(@Param("keyword") String keyword, Pageable pageable);
}
