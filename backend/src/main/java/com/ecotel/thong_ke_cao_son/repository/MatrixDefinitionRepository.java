package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.MatrixDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MatrixDefinitionRepository extends JpaRepository<MatrixDefinition, Long> {

    /** Mọi phiên bản của một mã, mới nhất trước. */
    @Query("""
        SELECT d FROM MatrixDefinition d
        WHERE d.code = :code
        ORDER BY d.effectiveFrom DESC NULLS LAST, d.id DESC
        """)
    List<MatrixDefinition> findVersions(@Param("code") String code);

    /**
     * Phiên bản có hiệu lực tại một ngày.
     *
     * <p>Khoảng để trống nghĩa là không giới hạn phía đó. Nhiều phiên bản
     * cùng thoả thì lấy cái có ngày bắt đầu MUỘN NHẤT — bản khai sau đè bản
     * khai trước, đúng trực giác "phiên bản mới nhất còn hiệu lực".
     */
    @Query("""
        SELECT d FROM MatrixDefinition d
        WHERE d.code = :code
          AND (d.effectiveFrom IS NULL OR d.effectiveFrom <= :date)
          AND (d.effectiveTo   IS NULL OR d.effectiveTo   >= :date)
        ORDER BY d.effectiveFrom DESC NULLS LAST, d.id DESC
        """)
    List<MatrixDefinition> findEffective(@Param("code") String code, @Param("date") LocalDate date);

    /** Danh sách mã (mỗi mã một dòng), dùng cho màn liệt kê các lưới. */
    @Query("SELECT DISTINCT d.code FROM MatrixDefinition d ORDER BY d.code")
    List<String> findDistinctCodes();

    List<MatrixDefinition> findAllByOrderByIdAsc();
}
