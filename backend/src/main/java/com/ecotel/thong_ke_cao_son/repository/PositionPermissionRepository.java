package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PositionPermissionRepository extends JpaRepository<PositionPermission, Long> {

    List<PositionPermission> findByPosition_Id(Long positionId);

    void deleteByPosition_Id(Long positionId);
}
