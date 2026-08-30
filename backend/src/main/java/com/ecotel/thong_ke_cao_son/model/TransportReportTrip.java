package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.ApprovalStatus;
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
        name = "transport_report_trips",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_transport_trip_dedup",
                        columnNames = {
                                "transport_report_id", "excavation_area_id", "excavator_device_id",
                                "loading_point_id", "unloading_point_id", "cargo_type_id",
                                "trip_count", "load_level_type", "load_level_custom_value",
                                "rainy_day", "supplementary_vehicle", "receiving_floor", "unloading_floor",
                                "total_route_distance_km", "total_route_lift_m",
                                "local_slope_distance_km", "local_slope_m"
                        })
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TransportReportTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "transport_report_trip_seq")
    @SequenceGenerator(name = "transport_report_trip_seq", sequenceName = "transport_report_trip_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transport_report_id", nullable = false)
    private TransportReport transportReport;

    @Column(name = "rainy_day", nullable = false)
    private Boolean rainyDay = false;

    @Column(name = "supplementary_vehicle", nullable = false)
    private Boolean supplementaryVehicle = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "excavation_area_id", nullable = false)
    private ExcavationArea excavationArea;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "excavator_device_id", nullable = false)
    private Device excavator;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loading_point_id", nullable = false)
    private ReceivingPoint loadingPoint;

    @Column(name = "receiving_floor")
    private Integer receivingFloor;

    @Column(name = "receiving_floor_group")
    private Integer receivingFloorGroup;

    @Column(name = "unloading_floor")
    private String unloadingFloor;

    @Column(name = "total_route_distance_km")
    private Double totalRouteDistanceKm;

    @Column(name = "total_route_lift_m")
    private Double totalRouteLiftM;

    @Column(name = "local_slope_distance_km")
    private Double localSlopeDistanceKm;

    @Column(name = "local_slope_m")
    private Double localSlopeM;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unloading_point_id", nullable = false)
    private Location unloadingPoint;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_type_id", nullable = false)
    private CargoType cargoType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_group_id", nullable = false)
    private CargoGroup cargoGroup;

    @Column(name = "trip_count")
    private Integer tripCount;

    @Embedded
    private LoadLevel loadLevel = new LoadLevel();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
