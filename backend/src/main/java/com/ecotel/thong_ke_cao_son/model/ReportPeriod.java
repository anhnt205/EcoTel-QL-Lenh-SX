package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Danh mục KỲ BÁO CÁO (QĐ-05).
 *
 * <p>Excel hard-code quy tắc chia kỳ ngay trong công thức cột {@code DL}
 * ({@code IF(B5<8,"Kỳ 01"…)}). Ở đây kỳ là <b>dữ liệu</b>, không phải luật
 * trong code: người dùng khai báo bao nhiêu kỳ tuỳ ý, mỗi kỳ một khoảng
 * ngày. Nhờ vậy câu hỏi "tháng 2 có 4 hay 5 kỳ" không còn đặt ra.
 *
 * <p>Việc gán một bản ghi vào kỳ là tra {@code fromDate ≤ ngày ≤ toDate},
 * nên ba ràng buộc dưới đây là bắt buộc, kiểm tra ở tầng service:
 * <ol>
 *   <li><b>Không chồng lấn</b> — một ngày không thuộc hai kỳ.</li>
 *   <li><b>Nằm gọn trong một tháng</b> — chủ dự án nói "chia kỳ trong tháng".</li>
 *   <li><b>Không hở</b> — kiểm tra khi tính sản lượng, vì lúc đang khai báo
 *       dở dang thì hở là chuyện bình thường.</li>
 * </ol>
 */
@Entity
@Table(
        name = "report_periods",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_report_period_year_month_index",
                columnNames = {"period_year", "period_month", "period_index"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ReportPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "report_period_seq")
    @SequenceGenerator(name = "report_period_seq", sequenceName = "report_period_seq", allocationSize = 50)
    private Long id;

    @NotNull(message = "Năm là bắt buộc")
    @Column(name = "period_year", nullable = false)
    private Integer year;

    @NotNull(message = "Tháng là bắt buộc")
    @Column(name = "period_month", nullable = false)
    private Integer month;

    /** Số thứ tự kỳ trong tháng, bắt đầu từ 1. */
    @NotNull(message = "Số kỳ là bắt buộc")
    @Column(name = "period_index", nullable = false)
    private Integer periodIndex;

    @NotNull(message = "Từ ngày là bắt buộc")
    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @NotNull(message = "Đến ngày là bắt buộc")
    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    /** Tên hiển thị, ví dụ "Kỳ 01, 1/5 đến 7/5". Tự sinh nếu để trống. */
    @Column(name = "display_name")
    private String displayName;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Số ngày của kỳ — báo cáo phải hiện kèm, vì kỳ cuối tháng ngắn hơn
     *  hẳn các kỳ khác nên so số tuyệt đối giữa các kỳ sẽ gây hiểu nhầm. */
    @Transient
    public int getDayCount() {
        if (fromDate == null || toDate == null) return 0;
        return (int) (toDate.toEpochDay() - fromDate.toEpochDay()) + 1;
    }
}
