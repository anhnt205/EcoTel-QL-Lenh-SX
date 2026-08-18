package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
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
        name = "excavation_report_trips",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_excavation_trip_dedup",
                        columnNames = {
                                "excavation_report_id", "cargo_type_id", "trip_count",
                                "load_level_type", "load_level_custom_value"
                        })
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ExcavationReportTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "excavation_report_trip_seq")
    @SequenceGenerator(name = "excavation_report_trip_seq", sequenceName = "excavation_report_trip_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "excavation_report_id", nullable = false)
    private ExcavationReport excavationReport;

    @Column(name = "trip_count")
    private Integer tripCount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_type_id", nullable = false)
    private CargoType cargoType;

    // Nhóm hàng — tự động lấy theo cargoType.cargoGroup, không nhận từ request
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_group_id", nullable = false)
    private CargoGroup cargoGroup;

    @Embedded
    private LoadLevel loadLevel = new LoadLevel();

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
