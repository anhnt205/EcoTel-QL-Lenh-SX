package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Danh mục KHU VỰC XÚC.
 *
 * <p>Tách riêng khỏi {@link Location} (bảng dùng chung cho nhiều loại địa
 * điểm) theo đúng đặc tả {@code docs/REQUIREMENT_SANLUONG.md} mục 2.1 —
 * xem ghi chú ở {@code docs/DECISIONS.md} về quan hệ với Location.
 */
@Entity
@Table(
        name = "excavation_areas",
        uniqueConstraints = @UniqueConstraint(name = "uk_excavation_area_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ExcavationArea {

    /** Nhóm Cao Sơn. */
    public static final String GROUP_CS = "CS";
    /** Nhóm Khe Chàm. */
    public static final String GROUP_KC = "KC";
    /** Hai nhóm hợp lệ — dùng chung cho cả kiểm tra dữ liệu lẫn danh sách chọn. */
    public static final java.util.List<String> GROUPS = java.util.List.of(GROUP_CS, GROUP_KC);

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "excavation_area_seq")
    @SequenceGenerator(name = "excavation_area_seq", sequenceName = "excavation_area_seq", allocationSize = 50)
    private Long id;

    /** Mã khu vực xúc — duy nhất. */
    @NotBlank(message = "Mã khu vực xúc là bắt buộc")
    @Column(name = "code", nullable = false)
    private String code;

    /** Tên khu vực xúc. */
    @NotBlank(message = "Tên khu vực xúc là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    /**
     * NHÓM khu vực — đúng hai giá trị {@code CS} (Cao Sơn) / {@code KC}
     * (Khe Chàm); xem QĐ-13.
     *
     * <p>Mọi công thức trong bảng tính so khu vực bằng {@code D5="CS"} /
     * {@code D5="KC"}, trong khi danh mục thật có nhiều khu (Khu Bắc, Khu
     * Nam, Bãi thải…). Vậy CS/KC là NHÓM, không phải mã khu vực. Các nơi
     * cần so: khoá cột Mô hình, khoá cột HS điều chỉnh, nhóm tầng nhận
     * tải, hệ số than CN-NK, tỷ lệ và quy đổi đá thải.
     *
     * <p>Để trống nghĩa là CHƯA phân nhóm — công thức phải báo lỗi nghiệp
     * vụ rõ ràng, tuyệt đối không mặc định về một nhóm nào.
     */
    @Column(name = "area_group", length = 2)
    private String areaGroup;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
