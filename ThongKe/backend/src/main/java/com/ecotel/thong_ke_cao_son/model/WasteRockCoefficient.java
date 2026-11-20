package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Danh mục HỆ SỐ ĐÁ THẢI — hệ số quy đổi Đá thải từ tấn sang m3: {@code Đá thải (m3) = Đá thải (tấn) ÷ hệ số}.
 * Mỗi dòng: một khoảng THÁNG ("Thời gian": từ tháng/năm đến tháng/năm, bao gồm hai đầu) + một
 * {@link #excavationArea Khu vực xúc} + hệ số (bảng tính gốc dùng 2,625 cho khu vực KC và 2,617 cho khu vực CS —
 * chủ dự án tự khai ở danh mục này, không còn nằm cứng trong code).
 *
 * <p>Khoảng thời gian lưu thành NGÀY ĐẦU THÁNG của tháng bắt đầu và tháng kết thúc; cùng một khu vực xúc thì
 * các dòng không được chồng lấn thời gian.
 */
@Entity
@Table(name = "waste_rock_coefficients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WasteRockCoefficient {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "waste_rock_coefficient_seq")
    @SequenceGenerator(name = "waste_rock_coefficient_seq", sequenceName = "waste_rock_coefficient_seq", allocationSize = 50)
    private Long id;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    @NotNull(message = "Khu vực xúc là bắt buộc")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "excavation_area_id", nullable = false)
    private ExcavationArea excavationArea;

    /** Hệ số đá thải (vd 2,625) — chia Đá thải (tấn) để ra m3. */
    @NotNull(message = "Hệ số đá thải là bắt buộc")
    @Column(name = "coefficient", nullable = false, precision = 19, scale = 6)
    private BigDecimal coefficient;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
