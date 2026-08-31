package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.MatrixCell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatrixCellRepository extends JpaRepository<MatrixCell, Long> {

    List<MatrixCell> findByDefinitionId(Long definitionId);

    Optional<MatrixCell> findByDefinitionIdAndRowKeyAndColKey(
            Long definitionId, String rowKey, String colKey);

    @Modifying
    @Query("DELETE FROM MatrixCell c WHERE c.definition.id = :definitionId AND c.rowKey = :rowKey")
    int deleteByRowKey(@Param("definitionId") Long definitionId, @Param("rowKey") String rowKey);

    @Modifying
    @Query("DELETE FROM MatrixCell c WHERE c.definition.id = :definitionId AND c.colKey = :colKey")
    int deleteByColKey(@Param("definitionId") Long definitionId, @Param("colKey") String colKey);
}
