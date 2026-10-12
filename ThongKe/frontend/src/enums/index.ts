export enum JobTypeEnum {
  VEHICLE = "Vận hành xe",
  DRILL = "Vận hành khoan",
  SERVICE_VEHICLE = "Vận hành xe phục vụ",
  DOZER = "Vận hành gạt",
  EXCAVATOR = "Vận hành xúc",
  SIEVE = "Vận hành sàng",
  MAINTENANCE = "Sửa chữa, bảo dưỡng",
  PUMP = "Vận hành bơm",
  DISPATCHER = "Điều hành sản xuất",
  OTHER = "Khác",
}
export enum StatusDeviceEnum {
  AVAILABLE = "available",
  IN_USE = "in_use",
  MAINTENANCE = "maintenance",
  RETIRED = "retired",
}

export enum StatusOrderEnum {
  PENDING = "pending",
  INPROGRESS = "in_progress",
  COMPLETED = "completed",
  WARNING = "warning",
  CANCEL = "cancel",
}
export enum RoleEnum {
  ADMIN = "admin",
  DISPATCHER = "dispatcher",
  MANAGER = "manager",
  EMPLOYEE = "employee",
}

export enum StatusRepairEnum {
  INPROGRESS = "Chưa sửa xong",
  COMPLETED = "Đã sửa xong",
}

export enum AcceptedProductEnum {
  LAND = "Đất",
  COAL = "Than",
}

export enum DeviceTypeEnum {
  VEHICLE = "Xe",
  MACHINE = "Máy",
}

export enum ReportEnum {
  INACTIVE_VEHICLES = "Xe không hoạt động",
  EXCAVATOR_TRIP_LIST = "Biểu chấm chuyến máy xúc (Mẫu 01)",
  CAR_TRIP_LIST = "Biểu chấm chuyến xe (Mẫu 03)",
  WORK_REPORT_SLIP = "Phiếu báo công",
  TIMESHEET = "Bảng chấm công",
  MEAL_REPORT_SLIP = "Phiếu báo ăn",
  SHIFT_HANDOVER = "Giao nhận ca",
  STAFF_SHIFT_HANDOVER = "Giao ca cán bộ",
  SHIFT_SUMMARY_GRADER = "Tổng hợp số liệu trong ca (Máy gạt)",
  SHIFT_SUMMARY_DRILL = "Tổng hợp số liệu trong ca (Máy khoan)",
  SHIFT_SUMMARY_EXCAVATOR = "Tổng hợp số liệu trong ca (Máy xúc)",
  SHIFT_SUMMARY_CAR = "Tổng hợp số liệu trong ca (Ô tô)",
  DATE_TRIP_CAR = "Báo cáo chuyến",
  DAILY_PRODUCTION_EXCAVATOR_REPORT = "Bản tổng hợp thống kê than, đất (Mẫu 02)",
  DAILY_PRODUCTION_CAR_REPORT = "Báo cáo sản lượng xe ô tô thực hiện (Mẫu 04)",
  PRODUCTIVITY_CAR_REPORT = "Báo cáo năng suất đầu xe (Mẫu 05)",
  PRODUCTION_LAND_CAR_REPORT = "Báo cáo sản lượng vận chuyển đất đá (Mẫu 06)",
  PRODUCTION_COAL_CAR_REPORT = "Báo cáo sản lượng vận chuyển than (Mẫu 07)",
  PRODUCTION_FUEL_MONITORING = "Sổ theo dõi sản lượng,nhiên liệu,gps,niêm phong kẹp chì (12b)",
  DAILY_ORDER = "Sổ nhật lệnh quản đốc",
  // Các báo cáo bị comment:
  // IN_KIND_ALLOWANCE_SLIP: 'Phiếu bồi dưỡng hiện vật',
  // OIL_RECEIPT_SLIP: 'Phiếu lĩnh dầu',
}