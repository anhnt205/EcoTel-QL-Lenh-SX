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
 * Danh mục HỆ SỐ THAN — mỗi dòng có hiệu lực trong một KHOẢNG THÁNG (cột "Thời gian": từ tháng/năm
 * đến tháng/năm), gồm hai hệ số: <b>Hệ số Than TKE trừ đá</b> và <b>Hệ số KCS</b> (bảng tính gốc: ô
 * "than tke tru da" và "than kcs", đơn vị tấn).
 *
 * <p>Bảng tính: {@code Tổng KLVC (tấn) = (Tổng m3 × Tỷ trọng − Đá thải − [Than: Trừ vơi]) ×
 * IF(SPNT = "than_sx", $AM$3, 1)} với {@code $AM$3 = Hệ số KCS ÷ Hệ số Than TKE trừ đá}
 * (190.993,45 ÷ 190.935,02 = 1,00031). Chủ dự án chốt 2026-11-16: đọc hàm và bảng.
 *
 * <p>Khoảng thời gian lưu thành NGÀY ĐẦU THÁNG của tháng bắt đầu và tháng kết thúc (bao gồm cả hai
 * đầu); các dòng không được chồng lấn nhau.
 */
@Entity
@Table(name = "coal_coefficients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CoalCoefficient {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "coal_coefficient_seq")
    @SequenceGenerator(name = "coal_coefficient_seq", sequenceName = "coal_coefficient_seq", allocationSize = 50)
    private Long id;

    /** Ngày đầu tháng của tháng bắt đầu hiệu lực. */
    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    /** Ngày đầu tháng của tháng cuối cùng còn hiệu lực (bao gồm). */
    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    /** Hệ số Than TKE trừ đá (ô "than tke tru da" của bảng tính). */
    @NotNull(message = "Hệ số Than TKE trừ đá là bắt buộc")
    @Column(name = "than_tke_tru_da", nullable = false, precision = 19, scale = 6)
    private BigDecimal thanTkeTruDa;

    /** Hệ số KCS (ô "than kcs" của bảng tính). */
    @NotNull(message = "Hệ số KCS là bắt buộc")
    @Column(name = "kcs", nullable = false, precision = 19, scale = 6)
    private BigDecimal kcs;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
