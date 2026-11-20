package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Danh mục GẦU XÚC — Máy xúc ({@link Device} thuộc nhóm MAY) chọn một gầu xúc từ danh mục này
 * (cột DG của bảng tính; trước đây chỉ là một con số tự do {@code Device.bucketCapacity}).
 */
@Entity
@Table(
        name = "excavator_buckets",
        uniqueConstraints = @UniqueConstraint(name = "uk_excavator_bucket_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ExcavatorBucket {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "excavator_bucket_seq")
    @SequenceGenerator(name = "excavator_bucket_seq", sequenceName = "excavator_bucket_seq", allocationSize = 50)
    private Long id;

    /** Mã gầu xúc — duy nhất. */
    @NotBlank(message = "Mã gầu xúc là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên gầu xúc. */
    @NotBlank(message = "Tên gầu xúc là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    /** Dung tích gầu (m³) — không bắt buộc; có giá trị thì ghi sang {@code Device.bucketCapacity} khi gán cho máy. */
    @Column(name = "capacity", precision = 19, scale = 6)
    private BigDecimal capacity;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
