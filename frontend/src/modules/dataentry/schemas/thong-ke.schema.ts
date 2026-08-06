import { z } from 'zod';

// 1. Zod Schema cho Khóa chung
export const commonKeySchema = z.object({
  month: z.number({ message: 'Tháng không được để trống' })
    .min(1, 'Tháng phải từ 1-12')
    .max(12, 'Tháng phải từ 1-12'),
  day: z.number({ message: 'Ngày không được để trống' })
    .min(1, 'Ngày phải từ 1-31')
    .max(31, 'Ngày phải từ 1-31'),
  shift: z.string({ message: 'Ca làm việc không được để trống' })
    .min(1, 'Ca làm việc không được để trống'),
  vehicleNo: z.string({ message: 'Số xe không được để trống' })
    .trim()
    .min(1, 'Số xe không được để trống'),
  tripCount: z.number({ message: 'Số chuyến không được để trống' })
    .min(1, 'Số chuyến phải lớn hơn hoặc bằng 1'),
  cargoType: z.string({ message: 'Chủng loại hàng không được để trống' })
    .trim()
    .min(1, 'Chủng loại hàng không được để trống'),
  fleet: z.string({ message: 'Đội xe không được để trống' })
    .trim()
    .min(1, 'Đội xe không được để trống'),
});

// Helper coercion cho Zod khi parse string từ Excel thành số
const coerceOptionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const parsed = Number(val);
  return isNaN(parsed) ? undefined : parsed;
}, z.number().optional());

// 2. Schema Nhập liệu Vận tải
export const transportEntrySchema = commonKeySchema.extend({
  id: z.string().optional(),
  excavationArea: z.string().optional(),
  excavatorEquipment: z.string().optional(),
  pickupLocation: z.string().optional(),
  extraLoad: coerceOptionalNumber,
  totalUnload: coerceOptionalNumber,
  fullRouteDistance: coerceOptionalNumber,
  fullRouteElevate: coerceOptionalNumber,
  localSlopeDist: coerceOptionalNumber,
  localSlopeDegree: coerceOptionalNumber,
  unloadLocationName: z.string().optional(),
  roda: z.string().optional(),
  earthDeduction: coerceOptionalNumber,
  workingDateRef: z.string().optional(),
  initialFuel: coerceOptionalNumber,
  receivedFuel: coerceOptionalNumber,
  finalFuel: coerceOptionalNumber,
  shiftCode: z.string().optional(),
});

export type TransportFormValues = z.infer<typeof transportEntrySchema>;

// 3. Schema Nhập liệu Khai thác (Máy Xúc)
export const miningEntrySchema = commonKeySchema.extend({
  id: z.string().optional(),
  miningUnit: z.string().optional(),
  mineCode: z.string({ message: 'Máy xúc không được để trống' })
    .trim()
    .min(1, 'Máy xúc không được để trống'),
  excavationBench: z.string().optional(),
  pickupLocation: z.string().optional(),
  dumpLocation: z.string().optional(),
  material: z.string().optional(),
  loadStatus: z.string().optional(),
  tempVolume: coerceOptionalNumber,
  tempWeight: coerceOptionalNumber,
  vehicleManagementUnit: z.string().optional(),
  vehicleType: z.string().optional(),
  initialFuel: coerceOptionalNumber,
  receivedFuel: coerceOptionalNumber,
  finalFuel: coerceOptionalNumber,
  fuelConsumption: coerceOptionalNumber,
  fuelNorm: coerceOptionalNumber,
  fuelDiff: coerceOptionalNumber,
  operatorBadgeNo: z.string().optional(),
  operatorName: z.string().optional(),
  operatorUnit: z.string().optional(),

  // Legacy compatibility fields
  category: z.string().optional(),
  contractCode: z.string().optional(),
  earthCargoDetail: z.string().optional(),
  coalCargoDetail: z.string().optional(),
  vehicleTypeDetail: z.string().optional(),
  company: z.string().optional(),
  cargoCode: z.string().optional(),
  cargoCategory: z.string().optional(),
  cargoName: z.string().optional(),
});

export type MiningFormValues = z.infer<typeof miningEntrySchema>;
