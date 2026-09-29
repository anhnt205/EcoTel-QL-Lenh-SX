package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Giá trị tại một ô của lưới.
 *
 * <p>Lưu THƯA: chỉ ô có giá trị mới có bản ghi. Lưới Mô hình là 145×48 nhưng
 * đa số tổ hợp chủng loại hàng × chủng loại xe không tồn tại trong thực tế,
 * nên lưu đủ 6960 dòng rỗng là lãng phí mà không thêm thông tin gì.
 *
 * <p>Ô trống và ô bằng 0 là HAI chuyện khác nhau: trống nghĩa là chưa khai
 * báo (công thức phải báo thiếu dữ liệu), 0 là đã khai báo và bằng không.
 */
@Entity
@Table(
        name = "matrix_cells",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_matrix_cell",
                columnNames = {"definition_id", "row_key", "col_key"}),
        indexes = @Index(name = "ix_matrix_cell_definition", columnList = "definition_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MatrixCell {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "matrix_cell_seq")
    @SequenceGenerator(name = "matrix_cell_seq", sequenceName = "matrix_cell_seq", allocationSize = 100)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "definition_id", nullable = false)
    private MatrixDefinition definition;

    @NotBlank
    @Column(name = "row_key", nullable = false)
    private String rowKey;

    @NotBlank
    @Column(name = "col_key", nullable = false)
    private String colKey;

    /** BigDecimal theo QĐ-08 — giá trị ô nhân thẳng vào sản lượng. */
    @NotNull
    @Column(name = "value", nullable = false, precision = 19, scale = 6)
    private BigDecimal value;
}
