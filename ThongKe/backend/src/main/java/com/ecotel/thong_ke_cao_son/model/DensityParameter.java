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
 * Danh mục TỶ TRỌNG — tham số khai báo theo thời gian (QĐ-04).
 *
 * <p>Excel tra tỷ trọng thẳng từ sheet {@code Mohinh_TheTrong} theo
 * {@code Chủng loại hàng × Khu vực xúc}, <b>không có chiều thời gian</b>.
 * Chủ dự án chốt làm theo docx: có khoảng hiệu lực, và khi tính thì lấy giá
 * trị có hiệu lực <b>tại ngày sản xuất của bản ghi</b> — không phải ngày
 * chạy báo cáo. Nhờ vậy chạy lại báo cáo tháng cũ vẫn ra đúng con số cũ.
 *
 * <p>Mockup vẽ ba tầng (phiếu → dòng → khoảng con) nhưng ở đây lưu PHẲNG.
 * Tầng phiếu chỉ là cách nhập cho nhanh, không mang thông tin gì thêm; lưu
 * phẳng thì việc tra theo ngày — thứ công thức thật cần — chỉ còn là một
 * câu truy vấn.
 *
 * <p>{@code excavationArea} để trống nghĩa là <b>áp cho mọi khu vực</b>. Khi
 * tra, bản ghi có khu vực cụ thể được ưu tiên hơn bản ghi "mọi khu vực".
 */
@Entity
@Table(
        name = "density_parameters",
        indexes = {
                @Index(name = "ix_density_lookup",
                        columnList = "cargo_type_id, excavation_area_id, effective_from, effective_to")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class DensityParameter {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "density_parameter_seq")
    @SequenceGenerator(name = "density_parameter_seq", sequenceName = "density_parameter_seq", allocationSize = 50)
    private Long id;

    @NotNull(message = "Chủng loại hàng là bắt buộc")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_type_id", nullable = false)
    private CargoType cargoType;

    /** Để trống = áp cho MỌI khu vực xúc. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "excavation_area_id")
    private ExcavationArea excavationArea;

    @NotNull(message = "Từ ngày là bắt buộc")
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @NotNull(message = "Đến ngày là bắt buộc")
    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    /** Tỷ trọng QUY ẨM — cột {@code CS.TyTrong}/{@code KC.TyTrong} của Excel. */
    @NotNull(message = "Tỷ trọng (quy ẩm) là bắt buộc")
    @Column(name = "density_wet", nullable = false, precision = 19, scale = 6)
    private BigDecimal densityWet;

    /** Tỷ trọng KHÔNG quy ẩm — cột {@code …TyTrongKoQA} của Excel. */
    @NotNull(message = "Tỷ trọng (không quy ẩm) là bắt buộc")
    @Column(name = "density_dry", nullable = false, precision = 19, scale = 6)
    private BigDecimal densityDry;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
