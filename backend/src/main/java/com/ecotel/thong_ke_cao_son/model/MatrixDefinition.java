package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Khai báo một BẢNG TRA HAI CHIỀU (danh mục dạng lưới).
 *
 * <p>Bốn danh mục trong đặc tả đều có chung một hình dạng — dòng là một khoá,
 * cột là một khoá khác, ô là một con số:
 *
 * <table>
 *   <tr><th>Danh mục</th><th>Dòng</th><th>Cột</th><th>Ô</th></tr>
 *   <tr><td>Mô hình (m3/ch)</td><td>Chủng loại hàng</td><td>Chủng loại xe + DMNL</td><td>m3/chuyến</td></tr>
 *   <tr><td>Định mức nhiên liệu</td><td>cung độ (dải)</td><td>độ dốc + loại xe</td><td>lít</td></tr>
 *   <tr><td>Năng suất xe (996)</td><td>chủng loại xe + phân loại</td><td>cung độ</td><td>năng suất</td></tr>
 *   <tr><td>HS điều chỉnh NLĐM</td><td>chủng loại xe + hạng</td><td>khu vực</td><td>hệ số</td></tr>
 * </table>
 *
 * <p>Nhập ~145 dòng × ~48 cột bằng bảng phẳng (mỗi ô một bản ghi) là không
 * dùng được, nên có màn lưới dùng chung. Bảng này giữ phần KHAI BÁO của lưới;
 * {@link MatrixAxisEntry} giữ trục, {@link MatrixCell} giữ giá trị ô.
 *
 * <p>Đây KHÔNG phải danh mục người dùng tự tạo: bốn lưới là cố định theo
 * nghiệp vụ, được seed sẵn theo {@code code}.
 */
@Entity
@Table(
        name = "matrix_definitions",
        uniqueConstraints = @UniqueConstraint(name = "uk_matrix_definition_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class MatrixDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "matrix_definition_seq")
    @SequenceGenerator(name = "matrix_definition_seq", sequenceName = "matrix_definition_seq", allocationSize = 50)
    private Long id;

    /** Mã lưới, dùng làm đường dẫn API. Vd {@code MO_HINH}. */
    @NotBlank
    @Column(name = "code", nullable = false)
    private String code;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    /** Nhãn cột đầu tiên của lưới, vd "Chủng loại hàng". */
    @Column(name = "row_axis_label")
    private String rowAxisLabel;

    /** Nhãn nhóm cột, vd "Chủng loại xe + DMNL". */
    @Column(name = "col_axis_label")
    private String colAxisLabel;

    /** Đơn vị của ô, hiện ở tiêu đề màn hình, vd "m3/chuyến". */
    @Column(name = "value_label")
    private String valueLabel;

    /** Đường dẫn danh mục gợi ý khi thêm dòng, vd {@code /cargo-types}. */
    @Column(name = "row_source_path")
    private String rowSourcePath;

    /** Đường dẫn danh mục gợi ý khi thêm cột. */
    @Column(name = "col_source_path")
    private String colSourcePath;

    /**
     * Trục dòng mang giá trị SỐ (dải giá trị) chứ không phải mã.
     *
     * <p>Quan trọng với Định mức nhiên liệu: Excel tra bằng {@code MATCH(…,1)}
     * và {@code SMALL(…)} để lấy hai dải kề nhau rồi nội suy, nên thứ tự SỐ
     * của các dòng là một phần của phép tính — sắp theo chuỗi sẽ cho
     * "10" &lt; "9" và làm sai kết quả nội suy.
     */
    @Column(name = "numeric_row_axis", nullable = false)
    private boolean numericRowAxis = false;

    /** Tương tự cho trục cột. */
    @Column(name = "numeric_col_axis", nullable = false)
    private boolean numericColAxis = false;

    /** Số chữ số thập phân khi hiển thị/làm tròn giá trị ô. */
    @Column(name = "value_scale", nullable = false)
    private int valueScale = 3;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
