package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục CHỦNG LOẠI XE.
 *
 * <p>Độc lập với {@link VehicleFuelClass} ("Chủng loại xe + DMNL") và
 * {@link VehicleCategoryClass} ("Chủng loại xe + Phân loại") — hai danh mục
 * đó là khoá tra của hai ma trận 2 chiều (Mô hình/DMNL và Năng suất xe),
 * còn danh mục này là danh mục chủng loại xe thuần tuý, không gắn với ma
 * trận nào.
 */
@Entity
@Table(
        name = "vehicle_types",
        uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_type_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class VehicleType {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vehicle_type_seq")
    @SequenceGenerator(name = "vehicle_type_seq", sequenceName = "vehicle_type_seq", allocationSize = 50)
    private Long id;

    /** Mã chủng loại xe — duy nhất. */
    @NotBlank(message = "Mã chủng loại xe là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên chủng loại xe. */
    @NotBlank(message = "Tên chủng loại xe là bắt buộc")
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
