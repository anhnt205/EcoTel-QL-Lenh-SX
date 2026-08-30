package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục NƠI DỠ TẢI.
 *
 * <p>Tách riêng khỏi {@link Location} (bảng dùng chung cho nhiều loại địa
 * điểm) theo đúng đặc tả {@code docs/REQUIREMENT_SANLUONG.md} mục 2.1 —
 * xem ghi chú ở {@code docs/DECISIONS.md} về quan hệ với Location.
 */
@Entity
@Table(
        name = "unloading_points",
        uniqueConstraints = @UniqueConstraint(name = "uk_unloading_point_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class UnloadingPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "unloading_point_seq")
    @SequenceGenerator(name = "unloading_point_seq", sequenceName = "unloading_point_seq", allocationSize = 50)
    private Long id;

    /** Mã nơi dỡ tải — duy nhất. */
    @NotBlank(message = "Mã nơi dỡ tải là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên nơi dỡ tải. */
    @NotBlank(message = "Tên nơi dỡ tải là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
