package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByMongoId(String mongoId);

    /** Dùng cho đăng nhập cục bộ (chế độ chạy độc lập, không qua Portal). */
    Optional<User> findByUsername(String username);

    @Query("""
        SELECT u FROM User u
        LEFT JOIN u.department dep
        LEFT JOIN u.position pos
        WHERE (:departmentId IS NULL OR dep.id = :departmentId)
           AND (:keyword IS NULL OR :keyword = ''
           OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(u.salaryCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(dep.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(pos.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<User> search(@Param("keyword") String keyword, @Param("departmentId") Long departmentId, Pageable pageable);

    Optional<User> findBySalaryCode(String salaryCode);

    boolean existsByPosition_Id(Long positionId);

    boolean existsByUsernameAndIdNot(String username, Long id);

    boolean existsBySalaryCodeAndIdNot(String salaryCode, Long id);
}
