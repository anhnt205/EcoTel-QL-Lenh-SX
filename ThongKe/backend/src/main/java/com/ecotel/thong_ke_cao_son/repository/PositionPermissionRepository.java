package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.PositionPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PositionPermissionRepository extends JpaRepository<PositionPermission, Long> {

    List<PositionPermission> findByPosition_Id(Long positionId);

    /**
     * PHẢI dùng {@code @Modifying} + {@code @Query} (bulk DELETE thật, chạy
     * ngay) — KHÔNG được để trần `void deleteByPosition_Id(Long)` như trước.
     * Spring Data JPA hiểu method `deleteBy...` KHÔNG có annotation là "nạp
     * hết entity rồi gọi remove() từng cái" (đưa vào action queue của
     * Hibernate, không chạy DELETE ngay) — mà Hibernate lại chạy INSERT
     * TRƯỚC DELETE trong action queue của cùng 1 transaction. Hệ quả thật đã
     * gặp: `PositionService.savePermissions` gọi delete-rồi-saveAll trong
     * cùng transaction → INSERT chạy trước, DELETE các dòng cũ (cùng
     * position_id+resource) chưa kịp chạy → vi phạm unique constraint
     * `uk_position_permission_resource`, lưu Chức vụ thất bại 100% mỗi khi
     * sửa quyền một Chức vụ ĐÃ có quyền từ trước (tự phát hiện qua test sống
     * 2026-09-10, không phải Codex nêu ra).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PositionPermission p WHERE p.position.id = :positionId")
    void deleteByPosition_Id(@Param("positionId") Long positionId);
}
