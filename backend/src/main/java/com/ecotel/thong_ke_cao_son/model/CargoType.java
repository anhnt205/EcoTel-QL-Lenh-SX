package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "cargo_types",
        indexes = {
                @Index(name = "idx_cargo_type_cargo_group", columnList = "cargo_group_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CargoType {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "cargo_type_seq")
    @SequenceGenerator(name = "cargo_type_seq", sequenceName = "cargo_type_seq", allocationSize = 50)
    private Long id;

    @NotBlank(message = "Tên loại hàng là bắt buộc")
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "code")
    private String code;

    @Column(name = "description")
    private String description;

    /**
     * Sản phẩm nghiệm thu — QĐ-09 (hợp nhất Material vào CargoType).
     *
     * <p>Trước đây là chuỗi tự do. Đổi sang khoá ngoại (mục S1) vì công thức
     * so giá trị này với các hằng { Dat_SX} / { Than_SX} / …; chuỗi
     * tự do thì sai một ký tự là công thức đi nhầm nhánh mà không báo gì.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acceptance_product_id")
    private AcceptanceProduct acceptanceProduct;

    /** TTL CLH — QĐ-09. Cũng đổi sang khoá ngoại theo mục S1. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ttl_clh_id")
    private TtlClh ttlClh;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_group_id", nullable = false)
    private CargoGroup cargoGroup;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
