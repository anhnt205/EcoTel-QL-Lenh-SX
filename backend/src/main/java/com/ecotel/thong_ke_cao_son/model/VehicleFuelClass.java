package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục CHỦNG LOẠI XE + DMNL (docx dòng 332).
 *
 * <p>Là <b>cột</b> của bảng hai chiều Mô hình (m3/ch) và của bảng Định mức
 * nhiên liệu — xem {@code docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md} mục 2.2.
 * Khác với {@link VehicleCategoryClass} (dùng cho bảng Năng suất xe 996):
 * cùng một chiếc xe có thể xếp nhóm khác nhau ở hai bảng đó.
 */
@Entity
@Table(
        name = "vehicle_fuel_classes",
        uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_fuel_class_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class VehicleFuelClass {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vehicle_fuel_class_seq")
    @SequenceGenerator(name = "vehicle_fuel_class_seq", sequenceName = "vehicle_fuel_class_seq", allocationSize = 50)
    private Long id;

    /** Mã chủng loại xe + DMNL — duy nhất. */
    @NotBlank(message = "Mã chủng loại xe + DMNL là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên chủng loại xe + DMNL. */
    @NotBlank(message = "Tên chủng loại xe + DMNL là bắt buộc")
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
