package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 1 dòng quyền C/R/U/D/A của 1 TÀI KHOẢN trên 1 "chức năng" (resource, xem
 * {@code PermissionResources.ALL}) — chủ dự án chốt 2026-09-10 (lượt 2): 2
 * tài khoản cùng Chức vụ vẫn cần set CRUD khác nhau được, nên quyền THẬT SỰ
 * dùng để gate (qua {@code LocalAuthService.permissionsFor}) đọc từ ĐÂY,
 * KHÔNG còn đọc trực tiếp từ {@link PositionPermission} của Chức vụ nữa.
 *
 * <p>{@link PositionPermission} giờ chỉ còn vai trò "mẫu mặc định" — khi tạo
 * tài khoản mới, màn Tài khoản đọc quyền của Chức vụ đã chọn để GỢI Ý sẵn
 * trên form (`PositionController#getById`), người tạo có thể sửa trước khi
 * lưu; sau khi lưu, bộ quyền này là CỦA RIÊNG tài khoản đó, đổi Chức vụ của
 * Chức vụ đó về sau KHÔNG tự động ảnh hưởng tài khoản đã tạo.
 *
 * <p>Resource ở đây PHẢI nằm trong {@code user.position.department.allowedResources}
 * — validate ở {@code UserService}, cùng quy tắc trần quyền như Chức vụ.
 */
@Entity
@Table(name = "user_permissions",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_permission_resource",
                columnNames = {"user_id", "resource"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_permission_seq")
    @SequenceGenerator(name = "user_permission_seq", sequenceName = "user_permission_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

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
