package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Location;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {

    @Query("""
        SELECT l FROM Location l
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(l.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR CAST(l.distance AS string) LIKE CONCAT('%', :keyword, '%')
        """)
    Page<Location> search(@Param("keyword") String keyword, Pageable pageable);
}
