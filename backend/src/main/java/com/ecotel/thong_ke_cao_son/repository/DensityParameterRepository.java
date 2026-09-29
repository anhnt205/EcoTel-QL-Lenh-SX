package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.DensityParameter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DensityParameterRepository extends JpaRepository<DensityParameter, Long> {

    @Query("""
        SELECT d FROM DensityParameter d
        JOIN FETCH d.cargoType ct
        LEFT JOIN FETCH d.excavationArea ea
        WHERE :keyword IS NULL OR :keyword = ''
           OR LOWER(ct.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(ct.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(ea.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    Page<DensityParameter> search(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Các bản ghi CHỒNG khoảng hiệu lực trên cùng một khoá.
     *
     * <p>Khoá là cặp {@code (chủng loại hàng, khu vực xúc)}, trong đó khu vực
     * để trống là một giá trị khoá hợp lệ ("mọi khu vực"). Hai khoảng đóng
     * chồng nhau khi {@code a.from <= b.to AND a.to >= b.from} — viết vậy để
     * không sót trường hợp khoảng này nằm lọt trong khoảng kia.
     *
     * <p>So khu vực bằng {@code IS NULL AND IS NULL} chứ không dùng
     * {@code =}: trong SQL {@code NULL = NULL} không đúng, nên nếu chỉ dùng
     * {@code =} thì hai bản ghi "mọi khu vực" chồng nhau sẽ lọt qua.
     */
    @Query("""
        SELECT d FROM DensityParameter d
        WHERE d.cargoType.id = :cargoTypeId
          AND (
                (:excavationAreaId IS NULL AND d.excavationArea IS NULL)
             OR (:excavationAreaId IS NOT NULL AND d.excavationArea.id = :excavationAreaId)
          )
          AND d.effectiveFrom <= :toDate
          AND d.effectiveTo   >= :fromDate
          AND (:selfId IS NULL OR d.id <> :selfId)
        """)
    List<DensityParameter> findOverlapping(@Param("cargoTypeId") Long cargoTypeId,
                                           @Param("excavationAreaId") Long excavationAreaId,
                                           @Param("fromDate") LocalDate fromDate,
                                           @Param("toDate") LocalDate toDate,
                                           @Param("selfId") Long selfId);

    /**
     * Bản ghi có hiệu lực tại một ngày, cho một chủng loại hàng.
     *
     * <p>Trả về cả bản khu vực cụ thể lẫn bản "mọi khu vực"; việc chọn bản
     * nào do tầng service quyết (cụ thể thắng). Không lọc ngay trong truy vấn
     * để chỉ cần một lần đi DB thay vì hai.
     */
    @Query("""
        SELECT d FROM DensityParameter d
        LEFT JOIN FETCH d.excavationArea
        WHERE d.cargoType.id = :cargoTypeId
          AND d.effectiveFrom <= :date
          AND d.effectiveTo   >= :date
          AND (d.excavationArea IS NULL OR d.excavationArea.id = :excavationAreaId)
        """)
    List<DensityParameter> findEffective(@Param("cargoTypeId") Long cargoTypeId,
                                         @Param("excavationAreaId") Long excavationAreaId,
                                         @Param("date") LocalDate date);
}
