package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** Danh mục HẬU TỐ (phần đuôi của khoá cột lưới, vd ".BK", ".DAT", ".Than"). */
@Entity
@Table(
        name = "suffixes",
        uniqueConstraints = @UniqueConstraint(name = "uk_suffix_value", columnNames = "suffix")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Suffix {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "suffix_seq")
    @SequenceGenerator(name = "suffix_seq", sequenceName = "suffix_seq", allocationSize = 50)
    private Long id;

    /** Hậu tố — duy nhất (phân biệt hoa/thường). */
    @NotBlank(message = "Hậu tố là bắt buộc")
    @Column(name = "suffix", nullable = false)
    private String suffix;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
