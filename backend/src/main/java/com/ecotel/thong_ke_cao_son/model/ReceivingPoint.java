package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục NƠI NHẬN TẢI.
 *
 * <p>Đặc tả: {@code docs/REQUIREMENT_SANLUONG.md} mục 2.1. Trường
 * {@code seamGroup} (Nhóm vỉa) chính là thành phần được dùng để dựng khoá
 * ghép "Nhóm vỉa + Máy xúc" (QĐ-06) — công thức Excel lấy Nhóm vỉa THEO
 * danh mục Nơi nhận tải, nên nó phải nằm ở đây.
 */
@Entity
@Table(
        name = "receiving_points",
        uniqueConstraints = @UniqueConstraint(name = "uk_receiving_point_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ReceivingPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receiving_point_seq")
    @SequenceGenerator(name = "receiving_point_seq", sequenceName = "receiving_point_seq", allocationSize = 50)
    private Long id;

    /** Mã nơi nhận tải — duy nhất. */
    @NotBlank(message = "Mã nơi nhận tải là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên nơi nhận tải. */
    @NotBlank(message = "Tên nơi nhận tải là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    /**
     * Nhóm vỉa — khoá ngoại tới danh mục Nhóm vỉa (mục S2).
     *
     * <p>Trước đây là chuỗi tự do, mà đây lại là THÀNH PHẦN ĐẦU của khoá ghép
     * "Nhóm vỉa + Máy xúc" dùng để tra danh mục STD. Sai một ký tự hoặc lệch
     * bảng mã là dòng STD không khớp, và triệu chứng chỉ là "thiếu dữ liệu"
     * chứ không phải một lỗi chỉ đúng chỗ sai.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seam_group_id")
    private SeamGroup seamGroup;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
