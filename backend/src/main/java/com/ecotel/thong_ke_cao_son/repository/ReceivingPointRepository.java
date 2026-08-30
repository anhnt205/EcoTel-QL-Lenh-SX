package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ReceivingPoint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReceivingPointRepository extends JpaRepository<ReceivingPoint, Long> {

    Optional<ReceivingPoint> findByCode(String code);

    /** Dùng khi nhập Excel — file chỉ có TÊN, không có id. */
    Optional<ReceivingPoint> findByName(String name);

    boolean existsByCodeAndIdNot(String code, Long id);

    @Query("""
        SELECT p FROM ReceivingPoint p
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(p.seamGroup) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<ReceivingPoint> search(@Param("keyword") String keyword, Pageable pageable);

    /** Nguồn dữ liệu cho combobox "Nhóm vỉa" — lấy các giá trị đã dùng. */
    @Query("""
        SELECT DISTINCT p.seamGroup FROM ReceivingPoint p
        WHERE p.seamGroup IS NOT NULL AND p.seamGroup <> ''
        ORDER BY p.seamGroup
        """)
    List<String> findDistinctSeamGroups();
}
