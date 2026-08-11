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
