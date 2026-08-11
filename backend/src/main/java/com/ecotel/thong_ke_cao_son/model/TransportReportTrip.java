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
@Table(name = "transport_report_trips")
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

    // "Khu vực xúc"
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "excavation_area_id", nullable = false)
    private Location excavationArea;

    // "Máy xúc" — cũng là 1 Device (lọc theo category.name ở tầng API, không ràng buộc cứng ở entity)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "excavator_device_id", nullable = false)
    private Device excavator;

    // "Nơi nhận tải"
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loading_point_id", nullable = false)
    private Location loadingPoint;

    // "Tầng nhận tải" — lưu số để tính "Nhóm tầng nhận tải"
    @Column(name = "receiving_floor")
    private Integer receivingFloor;

    // "Nhóm tầng nhận tải" — tính tự động, không cho nhập tay
    @Column(name = "receiving_floor_group")
    private Integer receivingFloorGroup;

    // "Tầng dỡ tải" — giữ String vì không có công thức tính, đúng như mô tả "(text)"
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

    // "Nơi dỡ tải"
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

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
