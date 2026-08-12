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
  totalScoops: coerceOptionalNumber,
  pickupLocation: z.string().optional(),
  material: z.string().optional(),
  loadStatus: z.string().optional(),
  loadStatusNote: z.string().optional(),
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
  loadStatus: z.string({ message: 'Tải trọng không được để trống' })
    .trim()
    .min(1, 'Tải trọng không được để trống'),
  loadStatusNote: z.string().optional(),
  vehicleManagementUnit: z.string().optional(),
  vehicleType: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.loadStatus === 'Khác') {
    const note = data.loadStatusNote?.trim().replace(/\s+/g, '') || '';
    if (!note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập ghi chú tải trọng dạng phân số khi chọn "Khác" (ví dụ: 1/2, 2/3)',
        path: ['loadStatusNote'],
      });
    } else if (!/^\d+\/[1-9]\d*$/.test(note)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chỉ chấp nhận dạng phân số không khoảng trắng, ví dụ: 1/2, 2/3',
        path: ['loadStatusNote'],
      });
    }
  }
});

export const miningSessionDraftSchema = z.object({
  workingDate: z.string({ message: 'Thời gian không được để trống' })
    .trim()
    .min(1, 'Thời gian không được để trống'),
  shift: z.string({ message: 'Ca làm việc không được để trống' })
    .trim()
    .min(1, 'Ca làm việc không được để trống'),
  pickupLocation: z.string({ message: 'Nơi chất tải không được để trống' })
    .trim()
    .min(1, 'Nơi chất tải không được để trống'),
  excavator: z.string({ message: 'Máy xúc không được để trống' })
    .trim()
    .min(1, 'Máy xúc không được để trống'),
  totalScoops: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Tầng xúc không được để trống' })
    .refine((v) => typeof v === 'number' && v > 0, { message: 'Tầng xúc phải lớn hơn 0' }),
  trips: z.array(miningRecordRowSchema).min(1, 'Phải có ít nhất 1 chuyến/bản ghi'),
  initialFuel: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Nhiên liệu tồn đầu không được để trống' })
    .refine((v) => typeof v === 'number' && v >= 0, { message: 'Nhiên liệu tồn đầu phải lớn hơn hoặc bằng 0' }),
  receivedFuel: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Nhiên liệu lĩnh không được để trống' })
    .refine((v) => typeof v === 'number' && v >= 0, { message: 'Nhiên liệu lĩnh phải lớn hơn hoặc bằng 0' }),
  finalFuel: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Nhiên liệu tồn cuối không được để trống' })
    .refine((v) => typeof v === 'number' && v >= 0, { message: 'Nhiên liệu tồn cuối phải lớn hơn hoặc bằng 0' }),
  operatorBadgeNo: z.string({ message: 'Số thẻ lương người vận hành không được để trống' })
    .trim()
    .min(1, 'Số thẻ lương người vận hành không được để trống'),
  operatorName: z.string().optional(),
  operatorUnit: z.string().optional(),
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
  loadStatus: z.string({ message: 'Tải trọng không được để trống' })
    .trim()
    .min(1, 'Tải trọng không được để trống'),
  loadStatusNote: z.string().optional(),
  pickupBench: z.union([z.string(), z.number()]).optional(),
  pickupBenchGroup: z.union([z.string(), z.number()]).optional(),
  unloadBench: z.string().optional(),
  fullRouteDistance: z.union([z.number(), z.literal('')]).optional(),
  fullRouteElevate: z.union([z.number(), z.literal('')]).optional(),
  localSlopeDist: z.union([z.number(), z.literal('')]).optional(),
  localSlopeDegree: z.union([z.number(), z.literal('')]).optional(),
  isRainyDay: z.boolean().optional(),
  isTraineeVehicle: z.boolean().optional(),
  equipmentUnit: z.string().optional(),
  vehicleType: z.string().optional(),
  cargoGroup: z.string({ message: 'Nhóm hàng không được để trống' })
    .trim()
    .min(1, 'Nhóm hàng không được để trống'),
}).superRefine((data, ctx) => {
  if (data.loadStatus === 'Khác') {
    const note = data.loadStatusNote?.trim().replace(/\s+/g, '') || '';
    if (!note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập ghi chú tải trọng dạng phân số khi chọn "Khác" (ví dụ: 1/2, 2/3)',
        path: ['loadStatusNote'],
      });
    } else if (!/^\d+\/[1-9]\d*$/.test(note)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chỉ chấp nhận dạng phân số không khoảng trắng, ví dụ: 1/2, 2/3',
        path: ['loadStatusNote'],
      });
    }
  }
});

export const transportSessionDraftSchema = z.object({
  workingDate: z.string({ message: 'Thời gian không được để trống' })
    .trim()
    .min(1, 'Thời gian không được để trống'),
  shift: z.string({ message: 'Ca làm việc không được để trống' })
    .trim()
    .min(1, 'Ca làm việc không được để trống'),
  initialFuel: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Nhiên liệu tồn đầu không được để trống' })
    .refine((v) => typeof v === 'number' && v >= 0, { message: 'Nhiên liệu tồn đầu phải lớn hơn hoặc bằng 0' }),
  receivedFuel: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Nhiên liệu lĩnh không được để trống' })
    .refine((v) => typeof v === 'number' && v >= 0, { message: 'Nhiên liệu lĩnh phải lớn hơn hoặc bằng 0' }),
  finalFuel: z.union([z.number(), z.literal('')])
    .refine((v) => v !== '', { message: 'Nhiên liệu tồn cuối không được để trống' })
    .refine((v) => typeof v === 'number' && v >= 0, { message: 'Nhiên liệu tồn cuối phải lớn hơn hoặc bằng 0' }),
  operatorBadgeNo: z.string({ message: 'Số thẻ lương người vận hành không được để trống' })
    .trim()
    .min(1, 'Số thẻ lương người vận hành không được để trống'),
  operatorName: z.string().optional(),
  operatorUnit: z.string().optional(),
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

