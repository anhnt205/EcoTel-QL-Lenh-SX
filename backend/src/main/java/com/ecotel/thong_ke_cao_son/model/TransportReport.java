package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.BatchSize;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "transport_reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_transport_report_key",
                        columnNames = {"report_date", "shift_id", "device_id", "employee_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TransportReport {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "transport_report_seq")
    @SequenceGenerator(name = "transport_report_seq", sequenceName = "transport_report_seq", allocationSize = 50)
    private Long id;

    @NotNull(message = "Thời gian là bắt buộc")
    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "fuel_beginning")
    private Double fuelBeginning;

    @Column(name = "fuel_ending")
    private Double fuelEnding;

    @Column(name = "fuel_received")
    private Double fuelReceived;

    @Column(name = "fuel_used")
    private Double fuelUsed;

    @BatchSize(size = 20)
    @OneToMany(mappedBy = "transportReport", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TransportReportTrip> trips = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void recalculateFuelUsed() {
        double beginning = fuelBeginning != null ? fuelBeginning : 0;
        double received = fuelReceived != null ? fuelReceived : 0;
        double ending = fuelEnding != null ? fuelEnding : 0;
        this.fuelUsed = beginning + received - ending;
    }
}
