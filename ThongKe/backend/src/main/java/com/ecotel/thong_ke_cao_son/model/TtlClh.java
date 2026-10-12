package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục TTL CLH.
 *
 * <p>Tách riêng khỏi {@link Location} (bảng dùng chung cho nhiều loại địa
 * điểm) theo đúng đặc tả {@code docs/REQUIREMENT_SANLUONG.md} mục 2.1 —
 * xem ghi chú ở {@code docs/DECISIONS.md} về quan hệ với Location.
 */
@Entity
@Table(
        name = "ttl_clh_items",
        uniqueConstraints = @UniqueConstraint(name = "uk_ttl_clh_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TtlClh {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ttl_clh_seq")
    @SequenceGenerator(name = "ttl_clh_seq", sequenceName = "ttl_clh_seq", allocationSize = 50)
    private Long id;

    /** Mã TTL CLH — duy nhất. */
    @NotBlank(message = "Mã TTL CLH là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên TTL CLH. */
    @NotBlank(message = "Tên TTL CLH là bắt buộc")
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
