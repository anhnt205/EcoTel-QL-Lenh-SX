package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Kết quả tính sản lượng của MỘT chuyến trong một kỳ — nguồn của màn
 * "Báo cáo thống kê".
 *
 * <p>Sheet {@code tinh toan} có 206 cột, nhưng phần lớn là bước đệm của
 * Excel (nội suy {@code AP}…{@code AY}, khoá ghép {@code CO}…{@code CW}).
 * Ở đây chỉ lưu các chỉ tiêu ĐẦU RA thật sự cần; những cột trung gian được
 * tính lại khi cần thay vì nhân bản vào CSDL.
 *
 * <p>Lưu kèm <b>hệ số đã dùng</b> ({@link #hsM3}, {@link #hsTon},
 * {@link #hsTkm}) chứ không chỉ kết quả: QĐ-04 yêu cầu truy được vì sao ra
 * con số đó, kể cả sau khi danh mục bị sửa về sau.
 */
@Entity
@Table(
        name = "production_results",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_production_result_trip_period",
                columnNames = {"report_period_id", "transport_trip_id"}),
        indexes = {
                @Index(name = "ix_production_result_period", columnList = "report_period_id"),
                @Index(name = "ix_production_result_key", columnList = "seam_group_excavator_key")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "production_result_seq")
    @SequenceGenerator(name = "production_result_seq", sequenceName = "production_result_seq", allocationSize = 100)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_period_id", nullable = false)
    private ReportPeriod reportPeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transport_trip_id", nullable = false)
    private TransportReportTrip transportTrip;

    @Column(name = "production_date", nullable = false)
    private LocalDate productionDate;

    @Column(name = "seam_group_excavator_key", nullable = false)
    private String seamGroupExcavatorKey;

    @Column(name = "acceptance_product")
    private String acceptanceProduct;

    // ── Lượt 1: chưa áp hệ số trắc địa ──────────────────────────────────────

    /** AL — Tổng m3. */
    @Column(name = "total_m3", precision = 19, scale = 6)
    private BigDecimal totalM3;

    /** AM — Tổng KLVC (tấn). */
    @Column(name = "total_ton", precision = 19, scale = 6)
    private BigDecimal totalTon;

    /** AN — Tổng Tkm. */
    @Column(name = "total_tkm", precision = 19, scale = 6)
    private BigDecimal totalTkm;

    // ── Lượt 2: đã áp hệ số của AP Tdia ─────────────────────────────────────

    /** DS — Tổng m3 sau hệ số trắc địa. */
    @Column(name = "survey_m3", precision = 19, scale = 6)
    private BigDecimal surveyM3;

    /** DW — tấn quy từ m3 trắc địa qua Thể trọng (TĐ). */
    @Column(name = "survey_ton", precision = 19, scale = 6)
    private BigDecimal surveyTon;

    /** DX — tkm tương ứng. */
    @Column(name = "survey_tkm", precision = 19, scale = 6)
    private BigDecimal surveyTkm;

    // ── Lượt 3: đã áp thêm hệ số của Ap Tkm ─────────────────────────────────

    /** DT — tấn cuối cùng. */
    @Column(name = "final_ton", precision = 19, scale = 6)
    private BigDecimal finalTon;

    /** DU — tkm cuối cùng. */
    @Column(name = "final_tkm", precision = 19, scale = 6)
    private BigDecimal finalTkm;

    // ── Vết tính toán ───────────────────────────────────────────────────────

    /** Tỷ trọng đã dùng. */
    @Column(name = "density_used", precision = 19, scale = 6)
    private BigDecimal densityUsed;

    /** Mô hình (m3/chuyến) đã dùng. */
    @Column(name = "model_used", precision = 19, scale = 6)
    private BigDecimal modelUsed;

    /** Thể trọng (TĐ) đã dùng để quy m3 sang tấn. */
    @Column(name = "bulk_density_used", precision = 19, scale = 6)
    private BigDecimal bulkDensityUsed;

    @Column(name = "hs_m3", precision = 19, scale = 10)
    private BigDecimal hsM3;

    @Column(name = "hs_ton", precision = 19, scale = 10)
    private BigDecimal hsTon;

    @Column(name = "hs_tkm", precision = 19, scale = 10)
    private BigDecimal hsTkm;

    // ── Nhánh nhiên liệu và năng suất (cột AZ…BR) ───────────────────────────

    /** BF — ĐMNL xe sau mọi hệ số điều chỉnh tháng. */
    @Column(name = "fuel_norm", precision = 19, scale = 6)
    private BigDecimal fuelNorm;

    /** BG — Nhiên liệu tiêu hao theo định mức (lít). */
    @Column(name = "fuel_base_consumption", precision = 19, scale = 6)
    private BigDecimal fuelBaseConsumption;

    /** BP — ĐMNL xe (QĐ 1828) = tiêu hao theo ĐM + tám khoản bù. */
    @Column(name = "fuel_total_before_adjustment", precision = 19, scale = 6)
    private BigDecimal fuelTotalBeforeAdjustment;

    /** BQ — NLĐM hiện hành. */
    @Column(name = "fuel_current_norm", precision = 19, scale = 6)
    private BigDecimal fuelCurrentNorm;

    /** BR — Định mức năng suất xe tải (chuyến/ca). */
    @Column(name = "productivity_norm", precision = 19, scale = 6)
    private BigDecimal productivityNorm;

    /** Chạy ở chế độ TKE (QĐ-03) — khi đó mọi hệ số trắc địa bằng 1. */
    @Column(name = "tke_mode", nullable = false)
    private boolean tkeMode = false;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;
}
