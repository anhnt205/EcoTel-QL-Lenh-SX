package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Position;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    Optional<Position> findByMongoId(String mongoId);

    Optional<Position> findByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    boolean existsByDepartment_Id(Long departmentId);

    @Query("""
        SELECT p FROM Position p
        LEFT JOIN p.department dep
        WHERE (:departmentId IS NULL OR dep.id = :departmentId)
           AND (:keyword IS NULL OR :keyword = ''
           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<Position> search(@Param("keyword") String keyword, @Param("departmentId") Long departmentId, Pageable pageable);
}
