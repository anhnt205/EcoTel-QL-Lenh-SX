package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.enums.ReconciliationSide;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Snapshot dữ liệu Vận tải/Khai thác của MỘT bên tại thời điểm bị yêu cầu sửa
 * đối chiếu — lưu để hiện qua icon "i" ở cột Sai lệch, KHÔNG dùng để phục hồi
 * tự động. Giá trị lưu PHẲNG (không FK sang CargoType/User) vì
 * {@code TransportReportTrip}/{@code ExcavationReportTrip} có ràng buộc
 * unique-dedup theo tổ hợp nhiều cột — lịch sử phải sống độc lập, không vướng
 * khi trip gốc đổi dữ liệu hoặc bị xoá. {@code tripId} vì lý do tương tự chỉ
 * là con trỏ thường, không phải quan hệ JPA.
 */
@Entity
@Table(name = "reconciliation_data_history")
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ReconciliationDataHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "reconciliation_data_history_seq")
    @SequenceGenerator(name = "reconciliation_data_history_seq", sequenceName = "reconciliation_data_history_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciliation_decision_id", nullable = false)
    private ReconciliationDecision reconciliationDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "side", nullable = false, length = 20)
    private ReconciliationSide side;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "cargo_type_name")
    private String cargoTypeName;

    @Column(name = "trip_count")
    private Integer tripCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "load_level_type", length = 30)
    private LoadLevelType loadLevelType;

    @Column(name = "load_level_custom_value")
    private String loadLevelCustomValue;

    @Column(name = "employee_salary_code")
    private String employeeSalaryCode;

    @Column(name = "employee_full_name")
    private String employeeFullName;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
