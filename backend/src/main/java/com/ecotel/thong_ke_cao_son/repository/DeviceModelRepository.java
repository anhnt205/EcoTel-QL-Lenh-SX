package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.DeviceModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceModelRepository extends JpaRepository<DeviceModel, Long> {

    Optional<DeviceModel> findByMongoId(String mongoId);

    @Query("""
        SELECT dm FROM DeviceModel dm
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(dm.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(dm.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<DeviceModel> search(@Param("keyword") String keyword, Pageable pageable);
}
