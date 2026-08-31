package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Một dòng hoặc một cột của lưới ({@link MatrixDefinition}).
 *
 * <p>Trục được lưu TƯỜNG MINH thay vì suy ra từ các ô đang có. Nếu suy ra thì
 * một dòng chưa nhập giá trị nào sẽ biến mất khỏi lưới ngay khi tải lại — lúc
 * nhập liệu thật, dòng trống là trạng thái bình thường, không phải lỗi.
 *
 * <p>{@code key} lưu MÃ của danh mục nguồn (mã ổn định) chứ không lưu id, vì
 * Excel gốc tra cứu bằng văn bản và khoá phải sống sót khi đổi tên hiển thị.
 */
@Entity
@Table(
        name = "matrix_axis_entries",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_matrix_axis_entry",
                columnNames = {"definition_id", "axis", "entry_key"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MatrixAxisEntry {

    public enum Axis { ROW, COL }

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "matrix_axis_entry_seq")
    @SequenceGenerator(name = "matrix_axis_entry_seq", sequenceName = "matrix_axis_entry_seq", allocationSize = 50)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "definition_id", nullable = false)
    private MatrixDefinition definition;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "axis", nullable = false, length = 3)
    private Axis axis;

    /** Khoá tra cứu — trùng với văn bản mà công thức dùng để MATCH. */
    @NotBlank
    @Column(name = "entry_key", nullable = false)
    private String key;

    /** Nhãn hiển thị; để trống thì dùng luôn {@link #key}. */
    @Column(name = "label")
    private String label;

    /**
     * Giá trị số của khoá, chỉ dùng cho trục số (dải giá trị).
     *
     * <p>Tách khỏi {@link #key} để phép nội suy so sánh trên SỐ, không phải
     * trên chuỗi.
     */
    @Column(name = "numeric_value", precision = 19, scale = 6)
    private BigDecimal numericValue;

    /** Thứ tự hiển thị cho trục không phải số. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
