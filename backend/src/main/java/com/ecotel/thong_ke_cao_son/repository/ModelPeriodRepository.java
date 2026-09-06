package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ModelPeriod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ModelPeriodRepository extends JpaRepository<ModelPeriod, Long> {

    /**
     * CHỈ fetch {@code cargoType} (một {@code @ManyToOne}, phân trang an
     * toàn) — KHÔNG fetch {@code values} ở đây: Hibernate không phân trang
     * đúng khi fetch join một {@code @OneToMany}. {@code values} lazy-load
     * riêng trong {@code toResponse()}, chấp nhận N+1 ở quy mô danh mục nội
     * bộ như Tỷ trọng đang chấp nhận.
     */
    @Query("""
        SELECT m FROM ModelPeriod m
        JOIN FETCH m.cargoType ct
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(ct.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(ct.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<ModelPeriod> search(@Param("keyword") String keyword, Pageable pageable);

    /** Các bản ghi CHỒNG khoảng hiệu lực của cùng một chủng loại hàng — xem `DensityParameterRepository#findOverlapping`. */
    @Query("""
        SELECT m FROM ModelPeriod m
        WHERE m.cargoType.id = :cargoTypeId
          AND m.effectiveFrom <= :toDate
          AND m.effectiveTo   >= :fromDate
          AND (:selfId IS NULL OR m.id <> :selfId)
        """)
    List<ModelPeriod> findOverlapping(@Param("cargoTypeId") Long cargoTypeId,
                                      @Param("fromDate") LocalDate fromDate,
                                      @Param("toDate") LocalDate toDate,
                                      @Param("selfId") Long selfId);

    /** Bản ghi có hiệu lực tại một ngày, cho một chủng loại hàng — dự phòng cho engine tính sản lượng. */
    @Query("""
        SELECT m FROM ModelPeriod m
        WHERE m.cargoType.id = :cargoTypeId
          AND m.effectiveFrom <= :date
          AND m.effectiveTo   >= :date
        """)
    List<ModelPeriod> findEffective(@Param("cargoTypeId") Long cargoTypeId, @Param("date") LocalDate date);
}
