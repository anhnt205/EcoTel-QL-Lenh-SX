package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "department_seq")
    @SequenceGenerator(name = "department_seq", sequenceName = "department_seq", allocationSize = 50)
    Long id;

    @Column(name = "mongo_id", unique = true)
    String mongoId;

    @NotBlank(message = "Department name is required")
    @Column(name = "name", nullable = false, unique = true)
    String name;

    @NotBlank(message = "Department code is required")
    @Column(name = "code", nullable = false, unique = true)
    String code;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    /**
     * Danh sách "chức năng" (resource, xem {@code PermissionResources.ALL})
     * mà phòng ban này được phép dùng — chủ dự án chốt 2026-09-10: Chức vụ
     * thuộc phòng ban chỉ được set quyền C/R/U/D trong ĐÚNG tập này, không
     * được vượt ra ngoài (validate ở {@code PositionService}).
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "department_resources", joinColumns = @JoinColumn(name = "department_id"))
    @Column(name = "resource", nullable = false)
    Set<String> allowedResources = new LinkedHashSet<>();

    /**
     * Phân quyền DỮ LIỆU theo đơn vị (khác {@link #allowedResources} — phân
     * quyền CHỨC NĂNG): mặc định false, tài khoản thuộc phòng ban này chỉ
     * thấy dữ liệu Vận tải/Khai thác/Đối chiếu của các thiết bị (xe/máy xúc)
     * CÙNG phòng ban ({@code Device.department}) — true thì thấy TOÀN BỘ,
     * không lọc (dành cho phòng ban kiểu Thống kê — xem
     * docs/REQUIREMENT_WORKFLOW.md). Chốt qua Quality Gate của Codex
     * (lượt 2, 2026-09-10): trước đây backend không hề lọc/xác minh theo
     * đơn vị — người có quyền CHỨC NĂNG vẫn đọc/sửa được dữ liệu đơn vị khác
     * qua API trực tiếp.
     */
    @Column(name = "full_data_scope", nullable = false)
    Boolean fullDataScope = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
