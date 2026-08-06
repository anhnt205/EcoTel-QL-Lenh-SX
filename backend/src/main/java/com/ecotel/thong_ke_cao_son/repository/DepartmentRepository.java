package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    @Query("""
        SELECT d FROM Department d
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(d.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<Department> search(@Param("keyword") String keyword, Pageable pageable);
}
