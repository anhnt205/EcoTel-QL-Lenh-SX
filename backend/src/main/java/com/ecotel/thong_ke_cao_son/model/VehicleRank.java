package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/** Danh mục HẠNG XE — mỗi hạng thuộc một {@link VehicleRankGroup}. */
@Entity
@Table(
        name = "vehicle_ranks",
        uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_rank_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class VehicleRank {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vehicle_rank_seq")
    @SequenceGenerator(name = "vehicle_rank_seq", sequenceName = "vehicle_rank_seq", allocationSize = 50)
    private Long id;

    /** Mã hạng xe — duy nhất. */
    @NotBlank(message = "Mã hạng xe là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /**
     * Xếp hạng — thứ tự trong nhóm.
     *
     * <p>Cột DB đặt tên {@code rank_order} chứ không phải {@code rank}: đó là
     * từ khoá cửa sổ (window function) trong chuẩn SQL, tránh rủi ro xung đột
     * dù PostgreSQL hiện coi nó là non-reserved.
     */
    @NotNull(message = "Xếp hạng là bắt buộc")
    @Column(name = "rank_order", nullable = false)
    private Integer rank;

    /** Nhóm hạng xe — khoá ngoại bắt buộc. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_rank_group_id", nullable = false)
    private VehicleRankGroup vehicleRankGroup;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
