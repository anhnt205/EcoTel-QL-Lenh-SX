package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.DeviceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceTypeRepository extends JpaRepository<DeviceType, Long> {

    Optional<DeviceType> findByMongoId(String mongoId);

    @Query("""
        SELECT dt FROM DeviceType dt
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(dt.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(dt.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<DeviceType> search(@Param("keyword") String keyword, Pageable pageable);
}
