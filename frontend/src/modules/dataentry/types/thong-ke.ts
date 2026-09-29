/**
 * Định nghĩa Type System cho Module Thống kê (Đối chiếu Vận tải – Khai thác)
 */

export type RoleType = "ROLE_TRANSPORT" | "ROLE_MINING" | "ROLE_STATISTICIAN";
export type ReconcileWorkflowStatus =
  "PENDING" | "APPROVED" | "REVISION_REQUESTED" | "AWAITING_REAPPROVAL";
export type DepartmentTarget = "MINING" | "TRANSPORT" | "BOTH";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REVISION_REQUESTED";

// 2. Bản ghi Nhập liệu bên VẬN TẢI (Xe) - Header & Detail
export interface TransportRecord {
  id?: string;
  reportId?: number;
  tripId?: number;
  status?: ApprovalStatus;
  note?: string;
  changeRequestNote?: string;
  year?: number;
  month?: number;
  day?: number;
  shift?: string; // Ca

  vehicleNo?: string; // Số xe
  vehicleType?: string; // Chủng loại xe
  equipmentUnit?: string; // Đơn vị quản lý thiết bị
  departmentId?: number;
  departmentName?: string;

  operatorBadgeNo?: string; // Số thẻ lương
  operatorName?: string; // Họ và tên
  operatorUnit?: string; // Đơn vị công tác
  employeeFullName?: string; // Họ tên người nhập chuyến (nhập tay, độc lập với Số thẻ lương)

  isRainyDay?: boolean; // Ngày mưa
  isTraineeVehicle?: boolean; // Xe bổ túc

  initialFuel?: number; // NL tồn đầu
  receivedFuel?: number; // NL lĩnh trong ca
  finalFuel?: number; // NL tồn cuối
  fuelConsumption?: number; // NL tiêu thụ (Calculated)

  // ==========================
  // B. Detail (1 dòng / chuyến)
  // ==========================
  excavationArea?: string; // Khu vực xúc
  excavatorEquipment?: string; // Máy xúc

  pickupLocation?: string; // Nơi nhận tải
  pickupBench?: string; // Tầng nhận tải
  pickupBenchGroup?: string | number; // Nhóm tầng nhận tải

  unloadLocationName?: string; // Nơi dỡ tải
  unloadBench?: string; // Tầng dỡ tải

  fullRouteDistance?: number; // CĐ toàn tuyến (Km)
  fullRouteElevate?: number; // Nâng tải toàn tuyến (m)

  localSlopeDist?: number; // CĐ dốc cục bộ (Km)
  localSlopeDegree?: number; // Dốc cục bộ (m)

  cargoType?: string; // Loại hàng
  cargoGroup?: string; // Nhóm hàng

  tripCount?: number; // Số chuyến
  loadStatus?: string; // Mức tải
  createdBy?: string; // Người nhập
  createdByName?: string; // Tên người nhập chuyến

  // Additional fields used in UI & reconciliation
  fleet?: string;
  shiftCode?: string;
  roda?: string;
  extraLoad?: string | number;
  totalUnload?: string | number;
  earthDeduction?: string | number;
  createdAt?: string;
  workingDateRef?: string;
}

// 3. Bản ghi Nhập liệu bên KHAI THÁC
export interface MiningRecord {
  // A. Thông tin chung ca
  id?: string;
  reportId?: number;
  tripId?: number;
  status?: ApprovalStatus;
  note?: string;
  changeRequestNote?: string;
  year?: number;
  month?: number;
  day?: number;
  shift?: string;
  miningUnit?: string; // Đơn vị khai thác (Danh mục)
  mineCode: string; // Máy xúc (Danh mục, VD: MX-01, EKG-5A)
  excavationBench?: string; // Tầng xúc (Danh mục / Text)
  departmentId?: number;
  departmentName?: string;
  // B. Chuyến xe nhận tải
  tripCount: number;
  transportVehicleNo?: string;
  pickupLocation?: string; // Nơi nhận tải (Danh mục / Text)
  dumpLocation?: string; // Vị trí đổ (Danh mục / Text)
  material?: string; // Vật liệu (Danh mục - tách riêng với loadStatus, VD: Đất đá, Than...)
  loadStatus?: string; // Loại hàng / Mức tải (Đủ tải / Roda (2/3) / Khác...)
  tempVolume?: number; // Khối lượng tạm tính (m3)
  tempWeight?: number; // Trọng lượng tạm tính (tấn)
  vehicleManagementUnit?: string; // Đơn vị quản lý thiết bị (Auto từ Số xe)
  vehicleType?: string; // Chủng loại xe (Auto từ Số xe)

  // C. Nhiên liệu (Chung theo máy xúc / ca)
  initialFuel?: number; // Nhiên liệu tồn đầu (Number)
  receivedFuel?: number; // Nhiên liệu lĩnh trong ca (Number)
  finalFuel?: number; // Nhiên liệu tồn cuối (Number)
  fuelConsumption?: number; // Nhiên liệu tiêu thụ (Calculated, locked/read-only)
  fuelNorm?: number; // Định mức (Number - Khuyến nghị bổ sung)
  fuelDiff?: number; // Tiết kiệm / Vượt định mức (Calculated, locked/read-only)

  // D. Người vận hành
  operatorBadgeNo?: string; // Số thẻ lương (Danh mục)
  operatorName?: string; // Họ và tên (Auto từ Số thẻ lương)
  operatorUnit?: string; // Đơn vị công tác (Auto từ Số thẻ lương)
  employeeFullName?: string; // Họ tên người nhập chuyến (nhập tay, độc lập với Số thẻ lương)

  // Trường tương thích cũ & UI
  vehicleNo?: string;
  fleet?: string;
  contractCode?: string; // Mã C/T
  category?: string; // Loại
  vehicleTypeDetail?: string; // Loại xe-PXVT
  cargoType?: string;
  extraLoad?: string | number;
  createdAt?: string;
  createdBy?: string;
  createdByName?: string; // Tên người nhập chuyến
}

// 4. View mode cho Batch Entry Form
export type BatchViewMode = "compact" | "expanded";

// 5. Kết quả Line-by-Line Validation của Import Excel
export interface ImportRowValidationResult<T> {
  rowIndex: number;
  rowData: Partial<T>;
  isValid: boolean;
  errors: string[];
}

// 6. Trạng thái đối chiếu cho màn hình Reconciliation
export type MatchStatus = "BOTH" | "TRANSPORT_ONLY" | "MINING_ONLY";

export interface ReconciliationItem {
  id: string;
  commonKey: {
    month: number;
    day: number;
    shift: string;
    vehicleNo: string;
    tripCount: number;
    cargoType: string;
    fleet: string;
  };
  transportRecord?: TransportRecord;
  miningRecord?: MiningRecord;
  status: MatchStatus;

  // QTM / Workflow status
  reconciliationStatus?: ReconcileWorkflowStatus;
  requestNote?: string;
  targetDepartment?: DepartmentTarget;
  requestedAt?: string;
  backendRow?: any;
}

export interface ReconciliationNotification {
  id: string;
  rowId: string;
  vehicleNo: string;
  shift: string;
  workingDate: string;
  senderName: string;
  targetDepartment: DepartmentTarget;
  message: string;
  createdAt: string;
  isRead: boolean;
}
