package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.CargoType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CargoTypeRepository extends JpaRepository<CargoType, Long> {

    @Query("""
        SELECT ct FROM CargoType ct
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(ct.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(ct.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<CargoType> search(@Param("keyword") String keyword, Pageable pageable);

    List<CargoType> findByCargoGroupId(Long cargoGroupId);

    Optional<CargoType> findByName(String name);

}
