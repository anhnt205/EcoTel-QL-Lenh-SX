package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** Danh mục LOẠI HÀNG. */
@Entity
@Table(
        name = "cargo_categories",
        uniqueConstraints = @UniqueConstraint(name = "uk_cargo_category_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CargoCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "cargo_category_seq")
    @SequenceGenerator(name = "cargo_category_seq", sequenceName = "cargo_category_seq", allocationSize = 50)
    private Long id;

    /** Mã loại hàng — duy nhất. */
    @NotBlank(message = "Mã loại hàng là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Loại hàng. */
    @NotBlank(message = "Loại hàng là bắt buộc")
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
