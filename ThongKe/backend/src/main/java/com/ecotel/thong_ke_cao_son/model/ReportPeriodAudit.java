package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.ReportPeriodAuditAction;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Vết chốt/mở khoá một {@link ReportPeriod} — bắt buộc theo QĐ-03 (bổ sung
 * 2026-08-30): "phải lưu vết: kỳ nào tính ở chế độ nào, ai bật, lúc nào" và
 * mở khoá kỳ đã chốt "là một hành động riêng… ghi lại ai mở, lúc nào, lý
 * do", kèm "giá trị sản lượng trước và sau" chứ không chỉ ghi đã đổi gì.
 *
 * <p>Danh tính người thao tác lưu trực tiếp {@code username}/{@code fullName}
 * từ JWT, KHÔNG dùng khoá ngoại tới {@link User}: token của Portal không
 * đảm bảo {@code sub} khớp một dòng trong bảng {@code users} cục bộ (xem
 * {@code AppTokenFilter}), nên ép FK ở đây sẽ vỡ ngay khi ghép lại Portal.
 *
 * <p>Ba cột tổng ({@code totalM3/Ton/Tkm}) là ảnh chụp NGAY TRƯỚC hành động:
 * với {@code LOCK} là kết quả vừa tính xong (sắp bị đóng băng); với
 * {@code UNLOCK} là kết quả đang có (sắp thành lỗi thời). Muốn xem "trước và
 * sau" một vòng mở khoá → tính lại → chốt lại: so ảnh chụp của dòng
 * {@code UNLOCK} với ảnh chụp của dòng {@code LOCK} kế tiếp cùng kỳ.
 */
@Entity
@Table(name = "report_period_audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportPeriodAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "report_period_audit_seq")
    @SequenceGenerator(name = "report_period_audit_seq", sequenceName = "report_period_audit_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_period_id", nullable = false)
    private ReportPeriod reportPeriod;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 16)
    private ReportPeriodAuditAction action;

    @NotNull
    @Column(name = "performed_by_username", nullable = false)
    private String performedByUsername;

    @Column(name = "performed_by_full_name")
    private String performedByFullName;

    @NotNull
    @Column(name = "performed_at", nullable = false)
    private LocalDateTime performedAt;

    /** Bắt buộc cho {@code UNLOCK} (QĐ-03: "ghi lại… lý do"); rỗng ở {@code LOCK}. */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    /** Chế độ tính (QĐ-03) đang áp dụng tại thời điểm ghi vết — null nếu kỳ chưa từng được tính. */
    @Column(name = "tke_mode")
    private Boolean tkeMode;

    @Column(name = "total_m3", precision = 19, scale = 6)
    private BigDecimal totalM3;

    @Column(name = "total_ton", precision = 19, scale = 6)
    private BigDecimal totalTon;

    @Column(name = "total_tkm", precision = 19, scale = 6)
    private BigDecimal totalTkm;
}
