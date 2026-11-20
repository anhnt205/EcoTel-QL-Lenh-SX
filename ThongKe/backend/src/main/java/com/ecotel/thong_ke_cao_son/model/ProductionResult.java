package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Kết quả tính sản lượng của MỘT chuyến trong một kỳ — nguồn của màn
 * "Báo cáo thống kê".
 *
 * <p>Sheet {@code tinh toan} có 206 cột, nhưng phần lớn là bước đệm của
 * Excel (nội suy {@code AP}…{@code AY}, khoá ghép {@code CO}…{@code CW}).
 * Ở đây chỉ lưu các chỉ tiêu ĐẦU RA thật sự cần; những cột trung gian được
 * tính lại khi cần thay vì nhân bản vào CSDL.
 *
 * <p>Lưu kèm <b>hệ số đã dùng</b> ({@link #hsM3}, {@link #hsTon},
 * {@link #hsTkm}) chứ không chỉ kết quả: QĐ-04 yêu cầu truy được vì sao ra
 * con số đó, kể cả sau khi danh mục bị sửa về sau.
 */
@Entity
@Table(
        name = "production_results",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_production_result_trip_period",
                columnNames = {"report_period_id", "transport_trip_id"}),
        indexes = {
                @Index(name = "ix_production_result_period", columnList = "report_period_id"),
                @Index(name = "ix_production_result_key", columnList = "seam_group_excavator_key")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "production_result_seq")
    @SequenceGenerator(name = "production_result_seq", sequenceName = "production_result_seq", allocationSize = 100)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_period_id", nullable = false)
    private ReportPeriod reportPeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transport_trip_id", nullable = false)
    private TransportReportTrip transportTrip;

    @Column(name = "production_date", nullable = false)
    private LocalDate productionDate;

    @Column(name = "seam_group_excavator_key", nullable = false)
    private String seamGroupExcavatorKey;

    @Column(name = "acceptance_product")
    private String acceptanceProduct;

    // ── Lượt 1: chưa áp hệ số trắc địa ──────────────────────────────────────

    /** AL — Tổng m3. */
    @Column(name = "total_m3", precision = 19, scale = 6)
    private BigDecimal totalM3;

    /** AM — Tổng KLVC (tấn). */
    @Column(name = "total_ton", precision = 19, scale = 6)
    private BigDecimal totalTon;

    /** AN — Tổng Tkm. */
    @Column(name = "total_tkm", precision = 19, scale = 6)
    private BigDecimal totalTkm;

    // ── Lượt 2: đã áp hệ số của AP Tdia ─────────────────────────────────────

    /** DS — Tổng m3 sau hệ số trắc địa. */
    @Column(name = "survey_m3", precision = 19, scale = 6)
    private BigDecimal surveyM3;

    /** DW — tấn quy từ m3 trắc địa qua Thể trọng (TĐ). */
    @Column(name = "survey_ton", precision = 19, scale = 6)
    private BigDecimal surveyTon;

    /** DX — tkm tương ứng. */
    @Column(name = "survey_tkm", precision = 19, scale = 6)
    private BigDecimal surveyTkm;

    // ── Lượt 3: đã áp thêm hệ số của Ap Tkm ─────────────────────────────────

    /** @deprecated 2026-11-16 — đã bỏ lượt 3; chỉ còn ở dữ liệu cũ (DT — tấn cuối cùng). */
    @Column(name = "final_ton", precision = 19, scale = 6)
    private BigDecimal finalTon;

    /** @deprecated 2026-11-16 — đã bỏ lượt 3; chỉ còn ở dữ liệu cũ (DU — tkm cuối cùng). */
    @Column(name = "final_tkm", precision = 19, scale = 6)
    private BigDecimal finalTkm;

    // ── Vết tính toán ───────────────────────────────────────────────────────

    /** Tỷ trọng đã dùng. */
    @Column(name = "density_used", precision = 19, scale = 6)
    private BigDecimal densityUsed;

    /** Mô hình (m3/chuyến) đã dùng. */
    @Column(name = "model_used", precision = 19, scale = 6)
    private BigDecimal modelUsed;

    /** Thể trọng (TĐ) đã dùng để quy m3 sang tấn. */
    @Column(name = "bulk_density_used", precision = 19, scale = 6)
    private BigDecimal bulkDensityUsed;

    @Column(name = "hs_m3", precision = 19, scale = 10)
    private BigDecimal hsM3;

    @Column(name = "hs_ton", precision = 19, scale = 10)
    private BigDecimal hsTon;

    @Column(name = "hs_tkm", precision = 19, scale = 10)
    private BigDecimal hsTkm;

    // ── Nhóm TKE "ban đầu" / "không quy ẩm" (cột CC…CG) ─────────────────────

    /** CF — Tỷ trọng ban đầu (luôn từ danh mục, bỏ qua tạm tính). */
    @Column(name = "density_original", precision = 19, scale = 6)
    private BigDecimal densityOriginal;

    /** CC — Tỷ trọng không quy ẩm. */
    @Column(name = "density_no_moisture", precision = 19, scale = 6)
    private BigDecimal densityNoMoisture;

    /** CG — Tổng KLVC TKE (m3) ban đầu — cột mà QĐ-02 nói tới. */
    @Column(name = "total_m3_original", precision = 19, scale = 6)
    private BigDecimal totalM3Original;

    /** CD — Tổng KLVC TKE (tấn, không quy ẩm). */
    @Column(name = "total_ton_no_moisture", precision = 19, scale = 6)
    private BigDecimal totalTonNoMoisture;

    /** CE — Tổng TKE (tkm, không quy ẩm). */
    @Column(name = "total_tkm_no_moisture", precision = 19, scale = 6)
    private BigDecimal totalTkmNoMoisture;

    // ── Đá thải (cột FK/FJ) và CK ───────────────────────────────────────────

    /** CK — Tổng KLVC TKE (tấn) ban đầu chưa trừ đá. */
    @Column(name = "total_ton_original_before_waste", precision = 19, scale = 6)
    private BigDecimal totalTonOriginalBeforeWaste;

    /** FK — Đá thải (tấn) = giá trị tự nhập (Báo chuyến) × CK, chỉ nhóm THANV. */
    @Column(name = "waste_rock_ton", precision = 19, scale = 6)
    private BigDecimal wasteRockTon;

    /** FJ — Đá thải (m3) = Đá thải (tấn) ÷ 2,625 (KC) / 2,617 (CS). */
    @Column(name = "waste_rock_m3", precision = 19, scale = 6)
    private BigDecimal wasteRockM3;

    // ── Mã hoá hàng (cột BT/BU/BV) ──────────────────────────────────────────

    /** BT — Mã hoá hàng. */
    @Column(name = "cargo_code")
    private String cargoCode;

    /** BU — Mã hàng TTL. */
    @Column(name = "cargo_ttl_code")
    private String cargoTtlCode;

    /** BV — Vỉa KPMB. */
    @Column(name = "seam_kpmb")
    private String seamKpmb;

    // ── Nhánh nhiên liệu và năng suất (cột AZ…BR) ───────────────────────────

    /** BF — ĐMNL xe sau mọi hệ số điều chỉnh tháng. */
    @Column(name = "fuel_norm", precision = 19, scale = 6)
    private BigDecimal fuelNorm;

    /** BG — Nhiên liệu tiêu hao theo định mức (lít). */
    @Column(name = "fuel_base_consumption", precision = 19, scale = 6)
    private BigDecimal fuelBaseConsumption;

    /** BP — ĐMNL xe (QĐ 1828) = tiêu hao theo ĐM + tám khoản bù. */
    @Column(name = "fuel_total_before_adjustment", precision = 19, scale = 6)
    private BigDecimal fuelTotalBeforeAdjustment;

    /** BQ — NLĐM hiện hành. */
    @Column(name = "fuel_current_norm", precision = 19, scale = 6)
    private BigDecimal fuelCurrentNorm;

    /** BR — Định mức năng suất xe tải (chuyến/ca). */
    @Column(name = "productivity_norm", precision = 19, scale = 6)
    private BigDecimal productivityNorm;

    // ── Nội suy định mức nhiên liệu (các bước trung gian của AZ) ─────────────

    /** Hb — Cung độ cận trên: mốc cung độ lớn nhất còn ≤ cung độ toàn tuyến (cột cung độ của bảng ĐM). */
    @Column(name = "fuel_hb", precision = 19, scale = 6)
    private BigDecimal fuelHb;

    /** Ha — Cung độ cận dưới: mốc cung độ nhỏ nhất còn ≥ cung độ toàn tuyến. */
    @Column(name = "fuel_ha", precision = 19, scale = 6)
    private BigDecimal fuelHa;

    /** h1 — Dốc cận trước: mốc độ dốc lớn nhất còn ≤ chênh cao thanh toán. */
    @Column(name = "fuel_h1", precision = 19, scale = 6)
    private BigDecimal fuelH1;

    /** h2 — Dốc cận sau: mốc độ dốc nhỏ nhất còn ≥ chênh cao thanh toán. */
    @Column(name = "fuel_h2", precision = 19, scale = 6)
    private BigDecimal fuelH2;

    /** Nb-h1 — ô lưới DMNL (Chủng loại xe + DMNL + Hb) tại dốc h1. */
    @Column(name = "fuel_nb_h1", precision = 19, scale = 6)
    private BigDecimal fuelNbH1;

    /** Nb-h2 — ô lưới DMNL (Chủng loại xe + DMNL + Hb) tại dốc h2. */
    @Column(name = "fuel_nb_h2", precision = 19, scale = 6)
    private BigDecimal fuelNbH2;

    /** Nb — nhiên liệu tương ứng Hb (nội suy theo dốc giữa Nb-h1 và Nb-h2). */
    @Column(name = "fuel_nb", precision = 19, scale = 6)
    private BigDecimal fuelNb;

    /** Na-h1 — ô lưới DMNL (Chủng loại xe + DMNL + Ha) tại dốc h1. */
    @Column(name = "fuel_na_h1", precision = 19, scale = 6)
    private BigDecimal fuelNaH1;

    /** Na-h2 — ô lưới DMNL (Chủng loại xe + DMNL + Ha) tại dốc h2. */
    @Column(name = "fuel_na_h2", precision = 19, scale = 6)
    private BigDecimal fuelNaH2;

    /** Na — nhiên liệu tương ứng Ha (nội suy theo dốc giữa Na-h1 và Na-h2). */
    @Column(name = "fuel_na", precision = 19, scale = 6)
    private BigDecimal fuelNa;

    /** Nt — NLĐM tiêu hao cần tìm (nội suy theo cung độ giữa Nb và Na). */
    @Column(name = "fuel_nt", precision = 19, scale = 6)
    private BigDecimal fuelNt;

    // ── Chuỗi hệ số của ĐMNL: Nt → mùa → (công ty) → hãng xe → cải tạo ben → × HS Than ─────────

    // ── Tám khoản BSNL (bù sung nhiên liệu, lít) = tỷ lệ của danh mục Hệ số BSNL × Nhiên liệu tiêu hao theo ĐM ─────

    @Column(name = "bsnl_roda", precision = 19, scale = 6)
    private BigDecimal bsnlRoda;

    @Column(name = "bsnl_rainy_day", precision = 19, scale = 6)
    private BigDecimal bsnlRainyDay;

    @Column(name = "bsnl_supplementary", precision = 19, scale = 6)
    private BigDecimal bsnlSupplementary;

    @Column(name = "bsnl_maintenance", precision = 19, scale = 6)
    private BigDecimal bsnlMaintenance;

    @Column(name = "bsnl_other", precision = 19, scale = 6)
    private BigDecimal bsnlOther;

    @Column(name = "bsnl_spnt", precision = 19, scale = 6)
    private BigDecimal bsnlSpnt;

    @Column(name = "bsnl_mud", precision = 19, scale = 6)
    private BigDecimal bsnlMud;

    /** ĐMNL theo mùa = hệ số mùa (tháng 6–9: 1,03; còn lại 1) × Nt. Cột "ĐMNL (công ty)" bằng đúng giá trị này. */
    @Column(name = "fuel_norm_seasonal", precision = 19, scale = 6)
    private BigDecimal fuelNormSeasonal;

    /** ĐMNL hãng xe = ĐMNL công ty × hệ số hạng xe (A 0,97 · B 1 · C1 1,04 · khác 1,06). */
    @Column(name = "fuel_norm_vehicle_class", precision = 19, scale = 6)
    private BigDecimal fuelNormVehicleClass;

    /** ĐMNL cải tạo ben = ĐMNL hãng xe × 1,03 nếu xe đã cải tạo toa, không thì bằng ĐMNL hãng xe. */
    @Column(name = "fuel_norm_car_renovation", precision = 19, scale = 6)
    private BigDecimal fuelNormCarRenovation;

    /** HS Than (CN-NK): 1 / 1,02 / 0,9 / 1,15 theo SPNT/CN, chủng loại xe, khu vực xúc, chủng loại hàng, cung độ. */
    @Column(name = "fuel_coal_cn_nk_factor", precision = 19, scale = 6)
    private BigDecimal fuelCoalCnNkFactor;

    /** @deprecated 2026-11-16 — đã bỏ chế độ TKE; luôn false với kết quả mới (cột DB giữ NOT NULL). */
    @Column(name = "tke_mode", nullable = false)
    private boolean tkeMode = false;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;
}
