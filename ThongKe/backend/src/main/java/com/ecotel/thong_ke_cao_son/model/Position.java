package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "positions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "position_seq")
    @SequenceGenerator(name = "position_seq", sequenceName = "position_seq", allocationSize = 50)
    private Long id;

    @Column(name = "mongo_id", unique = true)
    private String mongoId;

    @NotBlank(message = "Position name is required")
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "code")
    private String code;

    @Column(name = "description")
    private String description;

    /**
     * Phòng ban chủ quản — quyết định TRẦN quyền của Chức vụ này: mỗi quyền
     * gán ở {@code PositionPermission} phải nằm trong
     * {@code department.allowedResources} (validate ở {@code PositionService}).
     * Nullable vì các dòng seed cũ (trước 2026-09-10) chưa gán — Chức vụ chưa
     * có phòng ban thì chưa set được quyền nào (không có trần để so).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
