package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục KHU VỰC XÚC.
 *
 * <p>Tách riêng khỏi {@link Location} (bảng dùng chung cho nhiều loại địa
 * điểm) theo đúng đặc tả {@code docs/REQUIREMENT_SANLUONG.md} mục 2.1 —
 * xem ghi chú ở {@code docs/DECISIONS.md} về quan hệ với Location.
 */
@Entity
@Table(
        name = "excavation_areas",
        uniqueConstraints = @UniqueConstraint(name = "uk_excavation_area_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ExcavationArea {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "excavation_area_seq")
    @SequenceGenerator(name = "excavation_area_seq", sequenceName = "excavation_area_seq", allocationSize = 50)
    private Long id;

    /** Mã khu vực xúc — duy nhất. */
    @NotBlank(message = "Mã khu vực xúc là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên khu vực xúc. */
    @NotBlank(message = "Tên khu vực xúc là bắt buộc")
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
