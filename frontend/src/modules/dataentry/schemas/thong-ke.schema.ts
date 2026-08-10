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

// 4. Schema cho Dòng chuyến Khai thác (Máy Xúc Batch Entry)
export const miningRecordRowSchema = z.object({
  vehicleNo: z.string({ message: 'Số xe không được để trống' })
    .trim()
    .min(1, 'Số xe không được để trống'),
  tripCount: z.union([z.number(), z.string()])
    .transform((v) => Number(v))
    .refine((n) => !isNaN(n) && n >= 1, { message: 'Số chuyến phải lớn hơn hoặc bằng 1' }),
  material: z.string({ message: 'Loại hàng không được để trống' })
    .trim()
    .min(1, 'Loại hàng không được để trống'),
});

export const miningSessionDraftSchema = z.object({
  workingDate: z.string({ message: 'Thời gian không được để trống' })
    .trim()
    .min(1, 'Thời gian không được để trống'),
  shift: z.string({ message: 'Ca làm việc không được để trống' })
    .trim()
    .min(1, 'Ca làm việc không được để trống'),
  miningUnit: z.string({ message: 'Đơn vị khai thác không được để trống' })
    .trim()
    .min(1, 'Đơn vị khai thác không được để trống'),
  excavator: z.string({ message: 'Máy xúc không được để trống' })
    .trim()
    .min(1, 'Máy xúc không được để trống'),
  operatorBadgeNo: z.string({ message: 'Số thẻ lương người vận hành không được để trống' })
    .trim()
    .min(1, 'Số thẻ lương người vận hành không được để trống'),
  trips: z.array(miningRecordRowSchema).min(1, 'Phải có ít nhất 1 chuyến/bản ghi'),
});

export type MiningSessionDraftValues = z.infer<typeof miningSessionDraftSchema>;

export const validateMiningSession = (
  session: any,
  sessionIndex: number,
): { success: true } | { success: false; errorMsg: string } => {
  const result = miningSessionDraftSchema.safeParse(session);
  if (result.success) return { success: true };

  const firstIssue = result.error.issues[0];
  let locationInfo = `Bản ghi #${sessionIndex + 1}`;
  if (firstIssue.path[0] === 'trips' && typeof firstIssue.path[1] === 'number') {
    locationInfo += `, dòng chuyến #${firstIssue.path[1] + 1}`;
  }
  return {
    success: false,
    errorMsg: `${locationInfo}: ${firstIssue.message}`,
  };
};

// 5. Schema cho Dòng chuyến Vận tải (Xe Vận Tải Batch Entry)
export const transportTripRowSchema = z.object({
  excavationArea: z.string({ message: 'Khu vực xúc không được để trống' })
    .trim()
    .min(1, 'Khu vực xúc không được để trống'),
  excavatorEquipment: z.string({ message: 'Máy xúc không được để trống' })
    .trim()
    .min(1, 'Máy xúc không được để trống'),
  pickupLocation: z.string({ message: 'Nơi nhận tải không được để trống' })
    .trim()
    .min(1, 'Nơi nhận tải không được để trống'),
  unloadLocationName: z.string({ message: 'Nơi dỡ tải không được để trống' })
    .trim()
    .min(1, 'Nơi dỡ tải không được để trống'),
  cargoType: z.string({ message: 'Loại hàng không được để trống' })
    .trim()
    .min(1, 'Loại hàng không được để trống'),
  vehicleNo: z.string({ message: 'Số xe không được để trống' })
    .trim()
    .min(1, 'Số xe không được để trống'),
  tripCount: z.union([z.number(), z.string()])
    .transform((v) => Number(v))
    .refine((n) => !isNaN(n) && n >= 1, { message: 'Số chuyến phải lớn hơn hoặc bằng 1' }),
});

export const transportSessionDraftSchema = z.object({
  workingDate: z.string({ message: 'Thời gian không được để trống' })
    .trim()
    .min(1, 'Thời gian không được để trống'),
  shift: z.string({ message: 'Ca làm việc không được để trống' })
    .trim()
    .min(1, 'Ca làm việc không được để trống'),
  operatorBadgeNo: z.string({ message: 'Số thẻ lương người vận hành không được để trống' })
    .trim()
    .min(1, 'Số thẻ lương người vận hành không được để trống'),
  trips: z.array(transportTripRowSchema).min(1, 'Phải có ít nhất 1 chuyến'),
});

export type TransportSessionDraftValues = z.infer<typeof transportSessionDraftSchema>;

export const validateTransportSession = (
  session: any,
  sessionIndex: number,
): { success: true } | { success: false; errorMsg: string } => {
  const result = transportSessionDraftSchema.safeParse(session);
  if (result.success) return { success: true };

  const firstIssue = result.error.issues[0];
  let locationInfo = `Bản ghi #${sessionIndex + 1}`;
  if (firstIssue.path[0] === 'trips' && typeof firstIssue.path[1] === 'number') {
    locationInfo += `, chuyến #${firstIssue.path[1] + 1}`;
  }
  return {
    success: false,
    errorMsg: `${locationInfo}: ${firstIssue.message}`,
  };
};

