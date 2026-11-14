package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.CargoCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CargoCategoryRepository extends JpaRepository<CargoCategory, Long> {

    Optional<CargoCategory> findByCode(String code);

    /** Dùng khi nhập Excel — file chỉ có TÊN, không có id. */
    Optional<CargoCategory> findByName(String name);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT c FROM CargoCategory c
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<CargoCategory> search(@Param("keyword") String keyword, Pageable pageable);
}
