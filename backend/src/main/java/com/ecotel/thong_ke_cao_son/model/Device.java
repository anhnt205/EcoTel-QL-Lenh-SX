package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.DeviceStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "devices",
        indexes = {
                @Index(name = "idx_device_category_status", columnList = "category_id, status"),
                @Index(name = "idx_device_department", columnList = "department_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "device_seq")
    @SequenceGenerator(name = "device_seq", sequenceName = "device_seq", allocationSize = 50)
    private Long id;

    @Column(name = "mongo_id", unique = true)
    private String mongoId;

    // Gắn với đúng bản ghi TaiSan bên QL-TAISAN (nguồn gốc danh mục thiết bị)
    // để đồng bộ lại (đổi tên, loại, công suất...) không bị nhân đôi bản ghi.
    // Thiết bị nhập tay/import cũ (không qua đồng bộ) để trống field này.
    // Xem service/TaiSanSyncService.java.
    @Column(name = "external_tai_san_id", unique = true)
    private String externalTaiSanId;

    @NotBlank(message = "Device code is required")
    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "name")
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private DeviceType category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id")
    private DeviceModel material;

    @Column(name = "fuel_type")
    private String fuelType;

    @Column(name = "capacity")
    private Double capacity;

    @Column(name = "power")
    private Double power;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DeviceStatus status = DeviceStatus.AVAILABLE;

    @Embedded
    private Coordinates coordinates = new Coordinates();

    // ── Thuộc tính phục vụ TÍNH SẢN LƯỢNG (mục S3) ──────────────────────────
    //
    // Công thức lấy các giá trị này từ named range `DSXE` (danh sách xe) và
    // `DSMAY` (danh sách máy) của workbook gốc. Tất cả đều cho phép để trống:
    // dữ liệu thiết bị đã có sẵn từ trước, không thể bắt khai đủ ngay.
    //
    // Lưu ý: "Đơn vị quản lý thiết bị" (QLTB) KHÔNG thêm mới ở đây — nó chính
    // là `department` đã có. Thêm nữa sẽ thành hai chỗ cho một khái niệm.

    /** `CaiTaoToa` (cột CX) — xe đã cải tạo toa hay chưa. */
    @Column(name = "car_renovation")
    private String carRenovation;

    /**
     * Hạng xe (cột DB) dạng CHUỖI cũ: A, B, C1, hoặc khác.
     *
     * @deprecated dùng {@link #vehicleRank} — khoá ngoại tới danh mục Hạng
     *         xe (QĐ-13/bước 5). Giữ lại để dữ liệu cũ không mất; engine đọc
     *         {@code vehicleRank} trước, không có mới lùi về trường này.
     */
    @Deprecated
    @Column(name = "vehicle_class")
    private String vehicleClass;

    /** Chất lượng xe — thành phần còn lại của khoá tra HS điều chỉnh NLĐM. */
    @Column(name = "quality_level")
    private String qualityLevel;

    /**
     * <b>Chủng loại xe (NL)</b> — cột <b>DQ</b> của bảng tính.
     *
     * <p>Đây là GỐC của khoá cột lưới Định mức nhiên liệu: khoá đầy đủ =
     * {@code <DQ> + hậu tố theo quy tắc (.Bun/.Dat/.BK/.DAT|.Than) + "_" +
     * cung độ} — xem QĐ-11. KHÔNG phải cột DA, và KHÔNG gắn hậu tố khu vực.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fuel_class_id")
    private VehicleFuelClass fuelClass;

    /**
     * <b>Chủng loại xe</b> — cột <b>DA</b> (phần trước hậu tố khu vực).
     *
     * <p>Dùng ở hai chỗ, và KHÁC {@link #fuelClass} (QĐ-11):
     * <ul>
     *   <li>Lưới <b>Mô hình</b>: khoá cột = {@code <DA>.<CS|KC>}.
     *   <li>Lưới <b>Năng suất xe</b>: khoá cột = {@code <DA>.<DAT|Than>}.
     *   <li>Khoá {@code DC = <DA>_<chữ đầu hạng xe>} — điều kiện rẽ nhánh
     *       khi dựng khoá ĐMNL.
     * </ul>
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_type_id")
    private VehicleType vehicleType;

    /** Hạng xe (cột DB) — khoá ngoại tới danh mục Hạng xe, thay cho {@link #vehicleClass}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_rank_id")
    private VehicleRank vehicleRank;

    /**
     * Chủng loại xe + Phân loại — là DÒNG của lưới Năng suất xe (996).
     * Cách phân nhóm này ĐỘC LẬP với {@link #fuelClass}; cùng một chiếc xe có
     * thể thuộc nhóm khác nhau ở hai lưới.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_class_id")
    private VehicleCategoryClass categoryClass;

    /** Gầu xúc (cột DG) — chỉ có nghĩa với máy xúc, lấy từ `DSMAY`. */
    @Column(name = "bucket_capacity", precision = 19, scale = 6)
    private java.math.BigDecimal bucketCapacity;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @ElementCollection
    @CollectionTable(name = "device_files", joinColumns = @JoinColumn(name = "device_id"))
    private List<DeviceFile> files = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
