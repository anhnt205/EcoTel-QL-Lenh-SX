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

    /** Hạng xe (cột DB): A, B, C1, hoặc khác. Thành phần khoá tra HS điều chỉnh NLĐM. */
    @Column(name = "vehicle_class")
    private String vehicleClass;

    /** Chất lượng xe — thành phần còn lại của khoá tra HS điều chỉnh NLĐM. */
    @Column(name = "quality_level")
    private String qualityLevel;

    /**
     * Chủng loại xe + DMNL (cột DA/DQ) — là CỘT của lưới Mô hình và của lưới
     * Định mức nhiên liệu.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fuel_class_id")
    private VehicleFuelClass fuelClass;

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
