package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.FuelBsnlType;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Một dòng hệ số của chuỗi ĐMNL / BSNL — xem {@link FuelNormFactorKind}. Mỗi dòng có hiệu lực trong một KHOẢNG THÁNG
 * ("Thời gian": từ tháng/năm đến tháng/năm, bao gồm hai đầu; lưu thành ngày đầu tháng).
 *
 * <p>Cột điều kiện chỉ dùng ở nhóm tương ứng; để trống = không xét điều kiện đó. Các cột chữ ({@link #vehicleType},
 * {@link #vehicleCode}, {@link #cargo}) nhận NHIỀU giá trị cách nhau bằng dấu phẩy hoặc chấm phẩy; mỗi giá trị so không
 * phân biệt hoa thường, kết thúc bằng {@code *} nghĩa là "bắt đầu bằng" (vd {@code HD465*, CAT777E}).
 */
@Entity
@Table(name = "fuel_norm_factors", indexes = @Index(name = "ix_fuel_norm_factor_kind", columnList = "kind"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class FuelNormFactor {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "fuel_norm_factor_seq")
    @SequenceGenerator(name = "fuel_norm_factor_seq", sequenceName = "fuel_norm_factor_seq", allocationSize = 50)
    private Long id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 30)
    private FuelNormFactorKind kind;

    /** Loại BSNL (nhóm BSNL). */
    @Enumerated(EnumType.STRING)
    @Column(name = "bsnl_type", length = 30)
    private FuelBsnlType bsnlType;

    /** Dạng điều kiện (nhóm HS Than CN-NK) — quyết định trường nào được dùng và thứ tự xét. */
    @Enumerated(EnumType.STRING)
    @Column(name = "coal_condition", length = 30)
    private com.ecotel.thong_ke_cao_son.enums.FuelCoalCondition coalCondition;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    /** Hạng xe/máy (nhóm VEHICLE_RANK). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_rank_id")
    private VehicleRank vehicleRank;

    /** Chủng loại xe (nhóm COAL_CN_NK, BSNL): khớp với mã Chủng loại xe (NL) HOẶC mã Chủng loại xe của xe. */
    @Column(name = "vehicle_type_match", columnDefinition = "TEXT")
    private String vehicleType;

    /** Số xe (nhóm BSNL) — mã xe, vd {@code 965*}. */
    @Column(name = "vehicle_code_match", columnDefinition = "TEXT")
    private String vehicleCode;

    /** Chủng loại hàng (nhóm COAL_CN_NK, BSNL) — TÊN chủng loại hàng, vd {@code spnt.via, spnt_uot.via}. */
    @Column(name = "cargo_match", columnDefinition = "TEXT")
    private String cargo;

    /** Nhóm khu vực xúc CS / KC (nhóm COAL_CN_NK). */
    @Column(name = "area_group", length = 10)
    private String areaGroup;

    /** Điều kiện "cung độ toàn tuyến NHỎ HƠN" (km) (nhóm COAL_CN_NK). */
    @Column(name = "max_distance_km", precision = 19, scale = 6)
    private BigDecimal maxDistanceKm;

    /** Thứ tự xét: số nhỏ xét trước, dòng thoả đầu tiên thắng (nhóm COAL_CN_NK, BSNL). */
    @Column(name = "priority")
    private Integer priority;

    /** Làm tròn kết quả BSNL tới n chữ số thập phân (vd 1 → 1,88 thành 1,9); trống = không làm tròn thêm. */
    @Column(name = "round_digits")
    private Integer roundDigits;

    /** Hệ số. Nhóm BSNL là TỶ LỆ nhân với Nhiên liệu tiêu hao theo ĐM (0,05 = 5%). */
    @NotNull(message = "Hệ số là bắt buộc")
    @Column(name = "factor", nullable = false, precision = 19, scale = 6)
    private BigDecimal factor;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
