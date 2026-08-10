package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByMongoId(String mongoId);

    @Query("""
        SELECT d FROM Device d
        LEFT JOIN d.department dep
        LEFT JOIN d.category ct
        LEFT JOIN d.material mat
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.vehicleNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.fuelType) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.note) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(dep.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(ct.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(mat.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<Device> search(@Param("keyword") String keyword, Pageable pageable);
}
