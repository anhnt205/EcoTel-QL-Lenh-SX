/**
 * Tra cứu tự động thông tin Xe (Đơn vị quản lý, Chủng loại) & Người vận hành (Họ tên, Đơn vị công tác)
 * cùng danh mục tùy chọn & công thức Nhóm tầng nhận tải cho Bên Khai Thác & Vận Tải
 */

export interface VehicleInfo {
  vehicleManagementUnit: string;
  vehicleType: string;
}

export interface OperatorInfo {
  operatorName: string;
  operatorUnit: string;
}

// 1. Dictionary Tra cứu xe -> Đơn vị quản lý & Chủng loại
export const VEHICLE_LOOKUP: Record<string, VehicleInfo> = {
  "473": { vehicleManagementUnit: "PXVT 1", vehicleType: "CAT773E" },
  "99": { vehicleManagementUnit: "PXVT 2", vehicleType: "Komatsu HD465-7" },
  "14C-12345": { vehicleManagementUnit: "PXVT 5", vehicleType: "Scania P410" },
  "505 HD 465-7R": { vehicleManagementUnit: "PXVT 9", vehicleType: "HD 465-7R" },
  "CAT773E-01": { vehicleManagementUnit: "PXVT 1", vehicleType: "CAT773E" },
  "HD465-02": { vehicleManagementUnit: "PXVT 3", vehicleType: "Komatsu HD465-7" },
  "SCANIA-03": { vehicleManagementUnit: "PXVT 4", vehicleType: "Scania P410" },
  "VOLVO-08": { vehicleManagementUnit: "PXVT 7", vehicleType: "Volvo FMX" },
};

export const lookupVehicleInfo = (vehicleNo: string): VehicleInfo => {
  if (!vehicleNo) return { vehicleManagementUnit: "", vehicleType: "" };
  const trimmed = vehicleNo.trim();
  if (VEHICLE_LOOKUP[trimmed]) return VEHICLE_LOOKUP[trimmed];
  
  if (trimmed.toLowerCase().includes("cat")) {
    return { vehicleManagementUnit: "PXVT 1", vehicleType: "CAT773E" };
  }
  if (trimmed.toLowerCase().includes("hd")) {
    return { vehicleManagementUnit: "PXVT 9", vehicleType: "Komatsu HD465-7" };
  }
  return { vehicleManagementUnit: "PXVT 1 (Auto)", vehicleType: "Xe Vận Tải Khai Thác" };
};

// 2. Dictionary Tra cứu Thẻ lương -> Họ tên & Đơn vị công tác
export const OPERATOR_LOOKUP: Record<string, OperatorInfo> = {
  "TL001": { operatorName: "Nguyễn Văn Anh", operatorUnit: "Tổ Máy Xúc 1" },
  "TL002": { operatorName: "Trần Văn Bình", operatorUnit: "Tổ Máy Xúc 2" },
  "TL003": { operatorName: "Lê Hoàng Cường", operatorUnit: "Phân Xưởng Khai Thác 1" },
  "5251": { operatorName: "Trần Hồng Sơn", operatorUnit: "PXVT9" },
  "TL004": { operatorName: "Phạm Quốc Dũng", operatorUnit: "Phân Xưởng Khai Thác 2" },
  "NV055": { operatorName: "Hoàng Minh Em", operatorUnit: "Đội Vận Hành Máy Xúc" },
};

export const lookupOperatorInfo = (badgeNo: string): OperatorInfo => {
  if (!badgeNo) return { operatorName: "", operatorUnit: "" };
  const trimmed = badgeNo.trim();
  if (OPERATOR_LOOKUP[trimmed]) return OPERATOR_LOOKUP[trimmed];
  return { operatorName: "", operatorUnit: "" };
};



// 4. Danh mục & lọc máy xúc theo khu vực cho Vận Tải
export const EXCAVATION_AREAS = [
  "Khe Chàm",
  "Cao Sơn",
  "Cọc Six",
  "P15",
  "P20",
  "Moong Chính",
];

export const EXCAVATORS_BY_AREA: Record<string, string[]> = {
  "khe chàm": ["KC-MX01", "KC-MX02", "EKG-5A #01", "PC1250 #03"],
  "khe cham": ["KC-MX01", "KC-MX02", "EKG-5A #01", "PC1250 #03"],
  "cao sơn": ["CS-MX01", "CS-MX02", "CAT390D #01", "PC2000 #02"],
  "cao son": ["CS-MX01", "CS-MX02", "CAT390D #01", "PC2000 #02"],
  "cọc six": ["C6-MX01", "C6-MX02", "EKG-3.8 #01"],
  "coc six": ["C6-MX01", "C6-MX02", "EKG-3.8 #01"],
  "p15": ["P15-U6", "P15-MX02", "HT7"],
  "p20": ["P20-MX01", "P20-MX02"],
};

export const getExcavatorsForArea = (area: string): string[] => {
  if (!area) return ["U6", "P15", "HT7", "EKG-5A", "PC1250", "CAT390D"];
  const key = area.toLowerCase().trim();
  return EXCAVATORS_BY_AREA[key] || ["U6", "P15", "HT7", "EKG-5A", "PC1250", "CAT390D"];
};

// 5. Tra cứu Loại hàng -> Nhóm hàng cho Vận Tải
export const CARGO_TYPES = ["Than", "Đất", "Nomin", "Dthai", "Nomin.CN", "D.UOT"];

export const getCargoGroup = (cargoType: string): string => {
  switch (cargoType) {
    case "Than":
      return "Nhóm Than Nguyên Khai";
    case "Đất":
      return "Nhóm Đất Phủ Bóc";
    case "Nomin":
    case "Nomin.CN":
      return "Nhóm Nổ Minh";
    case "Dthai":
      return "Nhóm Đá Thải";
    case "D.UOT":
      return "Nhóm Đất Ướt";
    default:
      return "Nhóm Hàng";
  }
};

export const UNLOAD_LOCATIONS = [
  "Bãi sàng",
  "Kho Than",
  "Bãi dỡ 1",
  "Bãi dỡ Nam",
  "BangNau",
  "Băng tải Khe Chàm",
];

// 6. Danh mục cho Bên Khai Thác
export const MINING_UNITS = [
  "PXKT 1",
  "PXKT 2",
  "PXKT 3",
  "PXKT 4",
  "Công ty Khai thác Cao Sơn",
  "PX Vận tải 1",
];

export const EXCAVATORS = [
  "MX-01 (EKG-5A)",
  "MX-02 (PC1250)",
  "MX-03 (CAT390D)",
  "MX-05 (R984)",
  "MX-06 (PC2000)",
];

export const BENCHES = [
  "Tầng +15",
  "Tầng +20",
  "Tầng +30",
  "Tầng -50",
  "Mức +10",
];

export const PICKUP_LOCATIONS = [
  "Mỏ Cao Sơn - Moong 1",
  "Tầng +15",
  "ĐCS 11",
  "ĐCS 12",
  "Moong Tây",
];

export const DUMP_LOCATIONS = [
  "Bãi thải Nam",
  "Bãi thải Đông",
  "Kho Than 2",
  "Băng tải Khe Chàm",
];

export const MATERIALS = [
  "Đất đá",
  "Than nguyên khai",
  "Than cám",
  "Đá thải",
  "Quặng",
];

export const LOAD_STATUSES = [
  "Đủ tải",
  "Roda (2/3)",
  "1/2",
  "1/3",
  "Khác",
];

export const VEHICLE_NUMBERS = [
  "505 HD 465-7R",
  "473",
  "99",
  "14C-12345",
  "CAT773E-01",
  "HD465-02",
  "SCANIA-03",
];

export const OPERATOR_BADGES = [
  "5251",
  "TL001",
  "TL002",
  "TL003",
  "TL004",
  "NV055",
];
