package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Một giá trị của {@link ModelPeriod} theo Chủng loại xe — {@code vehicleKey}
 * là chuỗi tự do dạng {@code <mã chủng loại xe>.<CS|KC>} (cùng quy ước
 * {@code ProductionKeys.vehicleFuelClassKey}/DMNL), KHÔNG phải khoá ngoại —
 * giống hệt cách {@code MatrixCell.rowKey/colKey} đang làm.
 */
@Entity
@Table(
        name = "model_period_values",
        uniqueConstraints = @UniqueConstraint(name = "uk_model_period_value", columnNames = {"model_period_id", "vehicle_key"}),
        indexes = @Index(name = "ix_model_period_value_period", columnList = "model_period_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ModelPeriodValue {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "model_period_value_seq")
    @SequenceGenerator(name = "model_period_value_seq", sequenceName = "model_period_value_seq", allocationSize = 100)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "model_period_id", nullable = false)
    private ModelPeriod modelPeriod;

    @NotBlank
    @Column(name = "vehicle_key", nullable = false)
    private String vehicleKey;

    @NotNull
    @Column(name = "value", nullable = false, precision = 19, scale = 6)
    private BigDecimal value;
}
