import { z } from 'zod';

// Schema cho 1 chuyến
export const tripSchema = z.object({
  cargoType: z.string().min(1, 'Chọn loại hàng'),
  tripCount: z.coerce.number().min(1, 'Số chuyến ≥ 1'),
  loadingHeight: z.coerce.number().min(0).default(0),
  loadingModel: z.string().default('d'),
  weightInTons: z.coerce.number().min(0).default(0),
  underload: z.coerce.number().min(0).default(0),
  tripTimes: z.array(z.string()).default([]),
});

export type TripFormData = z.infer<typeof tripSchema>;

// Schema cho 1 nhóm
export const groupSchema = z.object({
  excavatorId: z.string().min(1, 'Chọn máy xúc'),
  loadingLocation: z.string().min(1, 'Chọn vị trí chất tải'),
  unloadingLocation: z.string().min(1, 'Chọn vị trí đổ tải'),
  shuntingVehicle: z.string().nullable().default(null),
  trips: z.array(tripSchema).min(1, 'Cần ít nhất 1 chuyến'),
});

export type GroupFormData = z.infer<typeof groupSchema>;

// Schema cho toàn bộ form
export const statisticFormSchema = z.object({
  workingDate: z.string().min(1, 'Chọn ngày làm việc'),
  shift: z.string().min(1, 'Chọn ca làm việc'),
  vehicleId: z.string().min(1, 'Chọn số xe'),
  driverLicenseId: z.string().min(1, 'Chọn lái xe'),
  staffLicenseId: z.string().nullable().default(null),
  initialGas: z.coerce.number().min(0).default(0),
  additionalGas: z.coerce.number().min(0).default(0),
  finalGas: z.coerce.number().min(0).default(0),
  vehicleSource: z.enum(['INTERNAL', 'OUTSOURCED']).default('INTERNAL'),
  groups: z.array(groupSchema).min(1, 'Cần ít nhất 1 nhóm'),
});

export type StatisticFormData = z.infer<typeof statisticFormSchema>;
