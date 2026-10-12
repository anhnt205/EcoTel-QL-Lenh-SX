package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Bảng HỆ SỐ TRẮC ĐỊA do hệ TỰ SINH — tương ứng hai sheet {@code AP Tdia
 * (m3-tan-tkm)} và {@code Ap Tkm} của workbook gốc.
 *
 * <p>Người dùng KHÔNG nhập bảng này (chủ dự án đã xác nhận: "bảng trung gian
 * hệ tự sinh"). Mỗi dòng là kết quả của một rào chắn tổng hợp:
 *
 * <pre>
 * Hệ số = Số trắc địa (danh mục STD) ÷ Tổng cộng dồn của cả kỳ
 * </pre>
 *
 * <p>Gộp theo {@code (kỳ, khoá Nhóm vỉa + Máy xúc, sản phẩm nghiệm thu)} —
 * đúng như khoá cột {@code "HS_" & AG5 & "_m3"} mà công thức dùng để tra.
 */
@Entity
@Table(
        name = "survey_coefficients",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_survey_coefficient",
                columnNames = {"kind", "report_period_id", "seam_group_excavator_key", "acceptance_product"}),
        indexes = @Index(name = "ix_survey_coefficient_lookup",
                columnList = "kind, report_period_id, seam_group_excavator_key")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SurveyCoefficient {

    public enum Kind {
        /** Sinh sau lượt 1 — cho hệ số m3 (và tấn/tkm hiển thị). */
        AP_TDIA,
        /** Sinh sau lượt 2 — hệ số áp cho tấn và tkm đã quy đổi. */
        AP_TKM
    }

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "survey_coefficient_seq")
    @SequenceGenerator(name = "survey_coefficient_seq", sequenceName = "survey_coefficient_seq", allocationSize = 50)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 10)
    private Kind kind;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_period_id", nullable = false)
    private ReportPeriod reportPeriod;

    @Column(name = "seam_group_excavator_key", nullable = false)
    private String seamGroupExcavatorKey;

    @Column(name = "acceptance_product", nullable = false)
    private String acceptanceProduct;

    /** Tổng cộng dồn từ các chuyến — MẪU SỐ của hệ số. */
    @Column(name = "total_m3", precision = 19, scale = 6)
    private BigDecimal totalM3;

    @Column(name = "total_ton", precision = 19, scale = 6)
    private BigDecimal totalTon;

    @Column(name = "total_tkm", precision = 19, scale = 6)
    private BigDecimal totalTkm;

    /** Số trắc địa lấy từ danh mục STD — TỬ SỐ của hệ số. */
    @Column(name = "survey_m3", precision = 19, scale = 6)
    private BigDecimal surveyM3;

    @Column(name = "survey_ton", precision = 19, scale = 6)
    private BigDecimal surveyTon;

    @Column(name = "survey_tkm", precision = 19, scale = 6)
    private BigDecimal surveyTkm;

    /**
     * Hệ số = số trắc địa ÷ tổng.
     *
     * <p>Tổng bằng 0 thì hệ số bằng 0 (docx dòng 253–255 nói rõ), KHÔNG phải
     * bằng 1 và cũng không phải lỗi chia cho 0.
     */
    @Column(name = "hs_m3", precision = 19, scale = 10)
    private BigDecimal hsM3;

    @Column(name = "hs_ton", precision = 19, scale = 10)
    private BigDecimal hsTon;

    @Column(name = "hs_tkm", precision = 19, scale = 10)
    private BigDecimal hsTkm;

    /** Số chuyến đã gộp — để người đọc biết hệ số dựa trên bao nhiêu dữ liệu. */
    @Column(name = "trip_count")
    private Integer tripCount;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;
}
