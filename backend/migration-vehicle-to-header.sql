-- =============================================================
-- Migration: Chuyển "Số xe" từ trip lên header
-- Chạy TRƯỚC KHI deploy code mới
-- =============================================================

-- ==================== TRANSPORT REPORTS ====================

-- 1. Thêm cột vehicle_id (nullable trước để migrate data)
ALTER TABLE transport_reports ADD COLUMN IF NOT EXISTS vehicle_id BIGINT;

-- 2. Populate vehicle_id từ trip đầu tiên của mỗi report
UPDATE transport_reports tr
SET vehicle_id = (
    SELECT trt.vehicle_id
    FROM transport_report_trips trt
    WHERE trt.transport_report_id = tr.id
    LIMIT 1
)
WHERE vehicle_id IS NULL;

-- 3. Kiểm tra report nào không có trip (nếu có thì cần xử lý thủ công)
-- SELECT id FROM transport_reports WHERE vehicle_id IS NULL;

-- 4. Thêm NOT NULL constraint
ALTER TABLE transport_reports ALTER COLUMN vehicle_id SET NOT NULL;

-- 5. Thêm FK constraint
ALTER TABLE transport_reports
    ADD CONSTRAINT fk_transport_report_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES devices(id);

-- 6. Xóa unique constraint cũ (device_id không tồn tại trên entity)
ALTER TABLE transport_reports DROP CONSTRAINT IF EXISTS uk_transport_report_key;

-- 7. Tạo unique constraint mới
ALTER TABLE transport_reports
    ADD CONSTRAINT uk_transport_report_key
    UNIQUE (report_date, shift_id, vehicle_id, employee_id);

-- 8. Xóa FK và cột vehicle_id trên trip
ALTER TABLE transport_report_trips DROP CONSTRAINT IF EXISTS fk_transport_report_trips_vehicle;
-- Tên FK có thể khác tùy Hibernate đã tạo tên gì, thử cả 2:
ALTER TABLE transport_report_trips DROP CONSTRAINT IF EXISTS fk_transport_trip_vehicle;
ALTER TABLE transport_report_trips DROP COLUMN IF EXISTS vehicle_id;


-- ==================== EXCAVATION REPORTS ====================

-- 1. Thêm cột vehicle_id (nullable trước để migrate data)
ALTER TABLE excavation_reports ADD COLUMN IF NOT EXISTS vehicle_id BIGINT;

-- 2. Populate vehicle_id từ trip đầu tiên của mỗi report
UPDATE excavation_reports er
SET vehicle_id = (
    SELECT ert.vehicle_device_id
    FROM excavation_report_trips ert
    WHERE ert.excavation_report_id = er.id
    LIMIT 1
)
WHERE vehicle_id IS NULL;

-- 3. Thêm NOT NULL constraint
ALTER TABLE excavation_reports ALTER COLUMN vehicle_id SET NOT NULL;

-- 4. Thêm FK constraint
ALTER TABLE excavation_reports
    ADD CONSTRAINT fk_excavation_report_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES devices(id);

-- 5. Xóa unique constraint cũ
ALTER TABLE excavation_reports DROP CONSTRAINT IF EXISTS uk_excavation_report_key;

-- 6. Tạo unique constraint mới
ALTER TABLE excavation_reports
    ADD CONSTRAINT uk_excavation_report_key
    UNIQUE (report_date, shift_id, vehicle_id, excavator_device_id, employee_id);

-- 7. Xóa FK và cột vehicle_device_id trên trip
ALTER TABLE excavation_report_trips DROP CONSTRAINT IF EXISTS fk_excavation_report_trips_vehicle;
-- Tên FK có thể khác tùy Hibernate:
ALTER TABLE excavation_report_trips DROP CONSTRAINT IF EXISTS fk_excavation_trip_vehicle;
ALTER TABLE excavation_report_trips DROP COLUMN IF EXISTS vehicle_device_id;


-- ==================== TRIP UNIQUE INDEXES ====================
-- (Hibernate ddl-auto:update sẽ tạo @UniqueConstraint, nhưng nếu muốn dùng COALESCE cho NULL fields thì chạy thêm)

-- Transport trip dedup (với COALESCE cho nullable fields)
CREATE UNIQUE INDEX IF NOT EXISTS uk_transport_trip_dedup ON transport_report_trips (
    transport_report_id, excavation_area_id, excavator_device_id,
    loading_point_id, unloading_point_id, cargo_type_id, trip_count, load_level_type,
    COALESCE(load_level_custom_value, ''), rainy_day, supplementary_vehicle,
    COALESCE(receiving_floor, -1), COALESCE(unloading_floor, ''),
    COALESCE(total_route_distance_km, -1), COALESCE(total_route_lift_m, -1),
    COALESCE(local_slope_distance_km, -1), COALESCE(local_slope_m, -1)
);

-- Excavation trip dedup
CREATE UNIQUE INDEX IF NOT EXISTS uk_excavation_trip_dedup ON excavation_report_trips (
    excavation_report_id, cargo_type_id, trip_count, load_level_type,
    COALESCE(load_level_custom_value, '')
);
