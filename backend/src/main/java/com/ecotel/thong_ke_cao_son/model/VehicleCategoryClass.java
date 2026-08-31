package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục CHỦNG LOẠI XE + PHÂN LOẠI (docx dòng 436).
 *
 * <p>Là <b>dòng</b> của bảng hai chiều Năng suất xe (996). Đừng nhầm với
 * {@link VehicleFuelClass} — hai cách phân nhóm xe này độc lập nhau.
 */
@Entity
@Table(
        name = "vehicle_category_classes",
        uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_category_class_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class VehicleCategoryClass {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vehicle_category_class_seq")
    @SequenceGenerator(name = "vehicle_category_class_seq", sequenceName = "vehicle_category_class_seq", allocationSize = 50)
    private Long id;

    /** Mã chủng loại xe + phân loại — duy nhất. */
    @NotBlank(message = "Mã chủng loại xe + phân loại là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên chủng loại xe + phân loại. */
    @NotBlank(message = "Tên chủng loại xe + phân loại là bắt buộc")
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
