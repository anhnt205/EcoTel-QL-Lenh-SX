package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.model.FuelNormFactor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuelNormFactorRepository extends JpaRepository<FuelNormFactor, Long> {

    List<FuelNormFactor> findByKind(FuelNormFactorKind kind);
}
