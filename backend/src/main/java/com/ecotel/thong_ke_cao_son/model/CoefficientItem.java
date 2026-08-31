package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục HỆ SỐ.
 *
 * <p>Docx dòng 315: <i>"Nếu Sản phẩm nghiệm thu là THAN &gt; * hệ số (Than
 * tke trừ đá / Than kcs) (set hệ số ở phần danh mục Hệ số)"</i>. Đây là các
 * hệ số nhân rời rạc, mỗi hệ số một dòng — khác hẳn các bảng tra hai chiều
 * như Mô hình hay Định mức nhiên liệu.
 */
@Entity
@Table(
        name = "coefficient_items",
        uniqueConstraints = @UniqueConstraint(name = "uk_coefficient_item_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CoefficientItem {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "coefficient_item_seq")
    @SequenceGenerator(name = "coefficient_item_seq", sequenceName = "coefficient_item_seq", allocationSize = 50)
    private Long id;

    /** Mã hệ số — duy nhất. */
    @NotBlank(message = "Mã hệ số là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên hệ số. */
    @NotBlank(message = "Tên hệ số là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    /** Giá trị hệ số. Dùng BigDecimal theo QĐ-08 — hệ số nhân trực tiếp vào
     *  sản lượng, sai số nhị phân của double sẽ tích luỹ qua từng chuyến. */
    @NotNull(message = "Giá trị hệ số là bắt buộc")
    @Column(name = "value", nullable = false, precision = 19, scale = 6)
    private java.math.BigDecimal value;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
