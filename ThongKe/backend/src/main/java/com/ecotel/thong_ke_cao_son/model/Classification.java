package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** Danh mục PHÂN LOẠI. */
@Entity
@Table(
        name = "classifications",
        uniqueConstraints = @UniqueConstraint(name = "uk_classification_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Classification {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "classification_seq")
    @SequenceGenerator(name = "classification_seq", sequenceName = "classification_seq", allocationSize = 50)
    private Long id;

    /** Mã phân loại — duy nhất. */
    @NotBlank(message = "Mã phân loại là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Phân loại. */
    @NotBlank(message = "Phân loại là bắt buộc")
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
