import { type ColumnDef } from "./types";
import {
  EXCAVATORS,
  BENCHES,
  PICKUP_LOCATIONS,
  DUMP_LOCATIONS,
  MATERIALS,
  LOAD_STATUSES,
  VEHICLE_NUMBERS,
  OPERATOR_BADGES,
} from "../utils/lookup";

// Danh sách cột đầy đủ cho Bên Khai Thác (Máy Xúc)
export const miningColumns: ColumnDef[] = [
  // A. THÔNG TIN CHUNG CA
  { key: "date", label: "Ngày", required: true, type: "date", width: "w-36" },
  {
    key: "shift",
    label: "Ca",
    required: true,
    type: "select",
    options: ["1", "2", "3"],
    width: "w-20",
  },
  {
    key: "mineCode",
    label: "Máy xúc",
    required: true,
    type: "select",
    options: EXCAVATORS,
    width: "w-36",
  },
  {
    key: "excavationBench",
    label: "Tầng xúc",
    type: "text",
    options: BENCHES,
    width: "w-32",
  },

  // B. DANH SÁCH CHUYỂN XE NHẬN TẢI
  {
    key: "vehicleNo",
    label: "Số xe",
    required: true,
    type: "text",
    options: VEHICLE_NUMBERS,
    width: "w-28",
  },
  {
    key: "tripCount",
    label: "Số chuyến",
    required: true,
    type: "number",
    width: "w-24",
  },
  {
    key: "pickupLocation",
    label: "Nơi chất tải",
    type: "text",
    options: PICKUP_LOCATIONS,
    width: "w-36",
  },
  {
    key: "dumpLocation",
    label: "Vị trí đổ",
    type: "text",
    options: DUMP_LOCATIONS,
    width: "w-36",
  },
  {
    key: "material",
    label: "Vật liệu",
    type: "select",
    options: MATERIALS,
    width: "w-28",
  },
  {
    key: "loadStatus",
    label: "Loại hàng (mức tải)",
    type: "select",
    options: LOAD_STATUSES,
    width: "w-36",
  },
  {
    key: "tempVolume",
    label: "KL tạm tính (m³)",
    type: "number",
    width: "w-32",
  },
  {
    key: "tempWeight",
    label: "TL tạm tính (tấn)",
    type: "number",
    width: "w-32",
  },
  {
    key: "vehicleManagementUnit",
    label: "Đơn vị quản lý thiết bị",
    type: "text",
    width: "w-36",
  },
  {
    key: "vehicleType",
    label: "Chủng loại xe",
    type: "text",
    width: "w-32",
  },

  // C. NHIÊN LIỆU (MÁY XÚC)
  {
    key: "initialFuel",
    label: "Nhiên liệu tồn đầu",
    type: "number",
    width: "w-28",
  },
  {
    key: "receivedFuel",
    label: "Nhiên liệu lĩnh ca",
    type: "number",
    width: "w-28",
  },
  {
    key: "finalFuel",
    label: "Nhiên liệu tồn cuối",
    type: "number",
    width: "w-28",
  },
  {
    key: "fuelConsumption",
    label: "Nhiên liệu tiêu thụ",
    type: "number",
    width: "w-28",
  },
  {
    key: "fuelNorm",
    label: "Định mức nhiên liệu",
    type: "number",
    width: "w-28",
  },
  {
    key: "fuelDiff",
    label: "Tiết kiệm/Vượt",
    type: "number",
    width: "w-32",
  },

  // D. NGƯỜI VẬN HÀNH
  {
    key: "operatorBadgeNo",
    label: "Số thẻ lương",
    type: "select",
    options: OPERATOR_BADGES,
    width: "w-28",
  },
  {
    key: "operatorName",
    label: "Họ và tên",
    type: "text",
    width: "w-36",
  },
  {
    key: "operatorUnit",
    label: "Đơn vị công tác",
    type: "text",
    width: "w-36",
  },
];
