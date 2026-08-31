package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportPeriodRepository extends JpaRepository<ReportPeriod, Long> {

    List<ReportPeriod> findByYearAndMonthOrderByPeriodIndexAsc(Integer year, Integer month);

    boolean existsByYearAndMonth(Integer year, Integer month);

    /** Tra kỳ của một ngày — dùng khi gán bản ghi vào kỳ. */
    @Query("""
        SELECT p FROM ReportPeriod p
        WHERE p.fromDate <= :date AND p.toDate >= :date
        """)
    Optional<ReportPeriod> findByDate(@Param("date") LocalDate date);

    /**
     * Các kỳ chồng lấn với khoảng [from, to], bỏ qua chính nó khi sửa.
     *
     * <p>Điều kiện chồng lấn của hai khoảng đóng là {@code a.from <= b.to AND
     * a.to >= b.from} — viết kiểu này để không sót trường hợp lồng nhau.
     */
    @Query("""
        SELECT p FROM ReportPeriod p
        WHERE p.fromDate <= :toDate AND p.toDate >= :fromDate
          AND (:selfId IS NULL OR p.id <> :selfId)
        """)
    List<ReportPeriod> findOverlapping(@Param("fromDate") LocalDate fromDate,
                                       @Param("toDate") LocalDate toDate,
                                       @Param("selfId") Long selfId);

    @Query("""
        SELECT p FROM ReportPeriod p
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(p.displayName) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR CAST(p.year AS string) LIKE CONCAT('%', :keyword, '%')
        """)
    Page<ReportPeriod> search(@Param("keyword") String keyword, Pageable pageable);
}
