package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.MatrixAxisEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatrixAxisEntryRepository extends JpaRepository<MatrixAxisEntry, Long> {

    List<MatrixAxisEntry> findByDefinitionId(Long definitionId);

    /** Xoá toàn bộ trục của một phiên bản — dùng khi xoá cả phiên bản. */
    @Modifying
    @Query("DELETE FROM MatrixAxisEntry e WHERE e.definition.id = :definitionId")
    int deleteByDefinitionId(@Param("definitionId") Long definitionId);

    Optional<MatrixAxisEntry> findByDefinitionIdAndAxisAndKey(
            Long definitionId, MatrixAxisEntry.Axis axis, String key);

    @Modifying
    @Query("DELETE FROM MatrixAxisEntry e WHERE e.definition.id = :definitionId AND e.axis = :axis AND e.key = :key")
    int deleteEntry(@Param("definitionId") Long definitionId,
                    @Param("axis") MatrixAxisEntry.Axis axis,
                    @Param("key") String key);
}
