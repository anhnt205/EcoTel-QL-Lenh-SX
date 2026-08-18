package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.ReconciliationStatus;
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
        name = "reconciliation_decisions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_reconciliation_transport_trip", columnNames = "transport_report_trip_id"),
                @UniqueConstraint(name = "uk_reconciliation_excavation_trip", columnNames = "excavation_report_trip_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ReconciliationDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "reconciliation_decision_seq")
    @SequenceGenerator(name = "reconciliation_decision_seq", sequenceName = "reconciliation_decision_seq", allocationSize = 50)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_report_trip_id")
    private TransportReportTrip transportReportTrip;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "excavation_report_trip_id")
    private ExcavationReportTrip excavationReportTrip;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReconciliationStatus status = ReconciliationStatus.NOT_APPROVED;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}