package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.VehicleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleTypeRepository extends JpaRepository<VehicleType, Long> {

    Optional<VehicleType> findByCode(String code);

    /** Dùng khi nhập Excel — file chỉ có TÊN, không có id. */
    Optional<VehicleType> findByName(String name);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT v FROM VehicleType v
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(v.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(v.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<VehicleType> search(@Param("keyword") String keyword, Pageable pageable);
}
