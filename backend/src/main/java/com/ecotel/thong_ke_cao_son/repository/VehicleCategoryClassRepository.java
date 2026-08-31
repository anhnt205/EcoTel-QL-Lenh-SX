package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.VehicleCategoryClass;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleCategoryClassRepository extends JpaRepository<VehicleCategoryClass, Long> {

    Optional<VehicleCategoryClass> findByCode(String code);

    /** Dùng khi nhập Excel — file chỉ có TÊN, không có id. */
    Optional<VehicleCategoryClass> findByName(String name);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT a FROM VehicleCategoryClass a
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(a.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<VehicleCategoryClass> search(@Param("keyword") String keyword, Pageable pageable);
}
