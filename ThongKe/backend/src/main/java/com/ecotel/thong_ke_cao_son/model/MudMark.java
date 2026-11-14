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
        name = "mud_marks",
        uniqueConstraints = @UniqueConstraint(name = "uk_mud_mark_name", columnNames = "name")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class MudMark {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "mud_mark_seq")
    @SequenceGenerator(name = "mud_mark_seq", sequenceName = "mud_mark_seq", allocationSize = 50)
    private Long id;

    /** Ký hiệu bùn — duy nhất (phân biệt hoa/thường). */
    @NotBlank(message = "Ký hiệu bùn là bắt buộc")
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
