package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserPermissionRepository extends JpaRepository<UserPermission, Long> {

    List<UserPermission> findByUser_Id(Long userId);

    /**
     * PHẢI dùng {@code @Modifying} + {@code @Query} (bulk DELETE thật, chạy
     * ngay), cùng lý do với {@code PositionPermissionRepository.deleteByPosition_Id}
     * — nếu để trần `void deleteByUser_Id(Long)`, Hibernate xếp INSERT của
     * `UserService.savePermissions` CHẠY TRƯỚC delete, vi phạm unique
     * constraint `uk_user_permission_resource` mỗi khi sửa lại quyền riêng
     * một tài khoản ĐÃ có quyền riêng từ trước.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserPermission p WHERE p.user.id = :userId")
    void deleteByUser_Id(@Param("userId") Long userId);
}
