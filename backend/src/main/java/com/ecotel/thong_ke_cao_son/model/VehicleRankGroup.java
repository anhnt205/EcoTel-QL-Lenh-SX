package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** Danh mục NHÓM HẠNG XE — nhóm cha của {@link VehicleRank}. */
@Entity
@Table(
        name = "vehicle_rank_groups",
        uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_rank_group_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class VehicleRankGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vehicle_rank_group_seq")
    @SequenceGenerator(name = "vehicle_rank_group_seq", sequenceName = "vehicle_rank_group_seq", allocationSize = 50)
    private Long id;

    /** Mã nhóm hạng xe — duy nhất. */
    @NotBlank(message = "Mã nhóm hạng xe là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên nhóm hạng xe. */
    @NotBlank(message = "Tên nhóm hạng xe là bắt buộc")
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
