package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Danh mục MÔ HÌNH (m3/chuyến) — theo Chủng loại hàng × Chủng loại xe.
 *
 * <p>Khác với Tỷ trọng (2 giá trị cố định), một dòng Mô hình cần NHIỀU giá
 * trị theo Chủng loại xe chọn được — xem {@link ModelPeriodValue}. Mỗi
 * dòng (một chủng loại hàng) có khoảng hiệu lực RIÊNG, tách nhỏ được —
 * đúng yêu cầu chủ dự án, khác với lưới {@code MatrixDefinition} dùng
 * chung cho DMNL/Năng suất xe/Hệ số điều chỉnh NLDM (một phiên bản = một
 * khoảng thời gian cho MỌI dòng).
 *
 * <p>Lưu PHẲNG như Tỷ trọng — không có tầng "phiếu"/"lô" nào lưu thêm.
 */
@Entity
@Table(
        name = "model_periods",
        indexes = {
                @Index(name = "ix_model_period_lookup",
                        columnList = "cargo_type_id, effective_from, effective_to")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ModelPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "model_period_seq")
    @SequenceGenerator(name = "model_period_seq", sequenceName = "model_period_seq", allocationSize = 50)
    private Long id;

    @NotNull(message = "Chủng loại hàng là bắt buộc")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_type_id", nullable = false)
    private CargoType cargoType;

    @NotNull(message = "Từ ngày là bắt buộc")
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @NotNull(message = "Đến ngày là bắt buộc")
    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @OneToMany(mappedBy = "modelPeriod", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ModelPeriodValue> values = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
