package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.CoalCoefficient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CoalCoefficientRepository extends JpaRepository<CoalCoefficient, Long> {

    /** Dòng có khoảng thời gian chứa ngày đầu tháng {@code monthStart}. */
    Optional<CoalCoefficient> findFirstByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqualOrderByEffectiveFromDesc(
            LocalDate monthStart, LocalDate sameMonthStart);

    /** Các dòng khác {@code id} có khoảng thời gian chồng lấn [from, to]. */
    List<CoalCoefficient> findByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqualAndIdNot(
            LocalDate to, LocalDate from, Long id);

    /** Như trên nhưng không loại trừ dòng nào (thêm mới). */
    List<CoalCoefficient> findByEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqual(
            LocalDate to, LocalDate from);
}
