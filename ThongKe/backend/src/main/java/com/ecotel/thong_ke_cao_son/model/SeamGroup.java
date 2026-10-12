package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục NHÓM VỈA.
 *
 * <p>Đặc tả gốc để Nhóm vỉa là combobox trong danh mục Nơi nhận tải
 * (docx dòng 105). Tách thành bảng riêng vì Nhóm vỉa là <b>thành phần đầu
 * tiên của khoá ghép</b> {@code Nhóm vỉa_Nhóm tầng_Máy xúc_Ký hiệu bùn_Khu
 * vực xúc_hậu tố} (docx dòng 490) — khoá này dùng để tra danh mục STD, nên
 * cần một tập giá trị chuẩn thay vì chuỗi tự do gõ tay.
 */
@Entity
@Table(
        name = "seam_groups",
        uniqueConstraints = @UniqueConstraint(name = "uk_seam_group_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class SeamGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seam_group_seq")
    @SequenceGenerator(name = "seam_group_seq", sequenceName = "seam_group_seq", allocationSize = 50)
    private Long id;

    /** Mã nhóm vỉa — duy nhất. */
    @NotBlank(message = "Mã nhóm vỉa là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên nhóm vỉa. */
    @NotBlank(message = "Tên nhóm vỉa là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
