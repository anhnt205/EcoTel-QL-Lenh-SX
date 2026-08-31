package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Danh mục STD (số liệu Trắc địa) — docx dòng 217 và 239.
 *
 * <p>Đặc tả có hai màn: <b>STD (Đất CN)</b> và <b>STD (Đất SX/Than SX)</b>.
 * Chúng dùng chung một bảng, phân biệt bằng {@link #catalogType}, vì cấu
 * trúc giống nhau — chỉ khác ở chỗ bản Đất SX/Than SX có thêm khối Than.
 *
 * <p><b>Một dòng chứa CẢ hai khối</b> (Đất và Than) thay vì tách thành hai
 * dòng. Đây là hình dạng của bảng gốc, và công thức Excel dựa vào đúng hình
 * dạng ấy: nó tra một dòng theo khoá rồi chọn cột theo tên —
 * {@code MATCH(IF(AG5="Dat_SX","TheTrong_Dat_TĐ","TheTrong_Than_TĐ"), …)}.
 * Tách hai dòng sẽ bắt người dùng gõ lại khoá lần thứ hai mà không được gì.
 *
 * <p>Giá trị được tra theo <b>khoá ghép + ngày sản xuất</b>, nên khoảng hiệu
 * lực phải không chồng lấn trên cùng một {@code (catalogType, khoá)} — cùng
 * kỷ luật với danh mục Tỷ trọng (QĐ-04).
 */
@Entity
@Table(
        name = "survey_standards",
        indexes = @Index(name = "ix_survey_standard_lookup",
                columnList = "catalog_type, seam_group_excavator_key, effective_from, effective_to")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class SurveyStandard {

    /** Hai màn danh mục trong đặc tả. */
    public enum CatalogType {
        /** STD (Đất CN) — chỉ dùng khối Đất. */
        DAT_CN,
        /** STD (Đất SX/Than SX) — dùng cả khối Đất và khối Than. */
        DAT_SX_THAN_SX
    }

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "survey_standard_seq")
    @SequenceGenerator(name = "survey_standard_seq", sequenceName = "survey_standard_seq", allocationSize = 50)
    private Long id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "catalog_type", nullable = false, length = 20)
    private CatalogType catalogType;

    /**
     * Khoá ghép "Nhóm vỉa + Máy xúc" — xem
     * {@link com.ecotel.thong_ke_cao_son.service.SeamGroupExcavatorKeys}.
     * Lưu dạng chuỗi đã ghép vì đó chính là thứ công thức dùng để MATCH.
     */
    @NotBlank(message = "Khoá Nhóm vỉa + Máy xúc là bắt buộc")
    @Column(name = "seam_group_excavator_key", nullable = false)
    private String seamGroupExcavatorKey;

    @NotNull(message = "Từ ngày là bắt buộc")
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @NotNull(message = "Đến ngày là bắt buộc")
    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    // ── Khối ĐẤT (Đất CN hoặc Đất SX, tuỳ catalogType) ──────────────────────

    /** "Đất CN (Sản phẩm nghiệm thu)" / "Đất SX (Sản phẩm nghiệm thu)". */
    @Column(name = "earth_acceptance_product")
    private String earthAcceptanceProduct;

    @Column(name = "earth_m3", precision = 19, scale = 6)
    private BigDecimal earthM3;

    /** V Tke — thể tích thiết kế. */
    @Column(name = "earth_design_volume", precision = 19, scale = 6)
    private BigDecimal earthDesignVolume;

    /** Clech — chênh lệch. */
    @Column(name = "earth_deviation", precision = 19, scale = 6)
    private BigDecimal earthDeviation;

    @Column(name = "earth_ton", precision = 19, scale = 6)
    private BigDecimal earthTon;

    /** CD đất — cung độ. */
    @Column(name = "earth_haul_distance", precision = 19, scale = 6)
    private BigDecimal earthHaulDistance;

    /** Thể trọng đất (TĐ) — cột {@code TheTrong_Dat_TĐ} của Excel. */
    @Column(name = "earth_bulk_density", precision = 19, scale = 6)
    private BigDecimal earthBulkDensity;

    @Column(name = "earth_tkm", precision = 19, scale = 6)
    private BigDecimal earthTkm;

    // ── Khối THAN (chỉ dùng khi catalogType = DAT_SX_THAN_SX) ───────────────

    @Column(name = "coal_acceptance_product")
    private String coalAcceptanceProduct;

    @Column(name = "coal_m3", precision = 19, scale = 6)
    private BigDecimal coalM3;

    /** Thể trọng than (TĐ) — cột {@code TheTrong_Than_TĐ} của Excel. */
    @Column(name = "coal_bulk_density", precision = 19, scale = 6)
    private BigDecimal coalBulkDensity;

    @Column(name = "coal_ton", precision = 19, scale = 6)
    private BigDecimal coalTon;

    /** Q Tke — sản lượng thiết kế (tương ứng V Tke của khối đất). */
    @Column(name = "coal_design_volume", precision = 19, scale = 6)
    private BigDecimal coalDesignVolume;

    @Column(name = "coal_deviation", precision = 19, scale = 6)
    private BigDecimal coalDeviation;

    /** CD than — cung độ. */
    @Column(name = "coal_haul_distance", precision = 19, scale = 6)
    private BigDecimal coalHaulDistance;

    @Column(name = "coal_tkm", precision = 19, scale = 6)
    private BigDecimal coalTkm;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
