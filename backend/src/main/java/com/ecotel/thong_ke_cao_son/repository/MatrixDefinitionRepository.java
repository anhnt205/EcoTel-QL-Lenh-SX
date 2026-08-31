package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.MatrixDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatrixDefinitionRepository extends JpaRepository<MatrixDefinition, Long> {

    Optional<MatrixDefinition> findByCode(String code);

    List<MatrixDefinition> findAllByOrderByIdAsc();
}
