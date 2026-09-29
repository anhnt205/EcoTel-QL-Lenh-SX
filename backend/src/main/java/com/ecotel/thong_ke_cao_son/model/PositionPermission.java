package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 1 dòng quyền C/R/U/D/A của 1 Chức vụ trên 1 "chức năng" (resource, xem
 * {@code PermissionResources.ALL}) — chủ dự án chốt 2026-09-10: thay hẳn
 * {@code Role} tĩnh cũ, quyền của tài khoản giờ tính hoàn toàn từ đây (qua
 * {@code LocalAuthService.permissionsFor}), không còn hard-code theo Role.
 *
 * <p>Resource ở đây PHẢI nằm trong {@code position.department.allowedResources}
 * — validate ở {@code PositionService}, không ràng buộc được ở tầng DB vì
 * "phòng ban cho phép resource nào" là 1 tập động (bảng {@code department_resources}),
 * không phải 1 FK đơn.
 */
@Entity
@Table(name = "position_permissions",
        uniqueConstraints = @UniqueConstraint(name = "uk_position_permission_resource",
                columnNames = {"position_id", "resource"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PositionPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "position_permission_seq")
    @SequenceGenerator(name = "position_permission_seq", sequenceName = "position_permission_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Column(name = "resource", nullable = false)
    private String resource;

    @Column(name = "can_create", nullable = false)
    private boolean canCreate;

    @Column(name = "can_read", nullable = false)
    private boolean canRead;

    @Column(name = "can_update", nullable = false)
    private boolean canUpdate;

    @Column(name = "can_delete", nullable = false)
    private boolean canDelete;

    /** Quyền duyệt (action "a") — vd duyệt kỳ báo cáo, duyệt đối chiếu. */
    @Column(name = "can_approve", nullable = false)
    private boolean canApprove;
}
