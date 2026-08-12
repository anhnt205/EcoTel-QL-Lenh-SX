import type {
  AcceptedProductEnum,
  DeviceTypeEnum,
  JobTypeEnum,
  StatusDeviceEnum,
  StatusOrderEnum,
} from "@/enums";

export interface User {
  _id: string;
  id?: number;
  username: string;
  password?: string;
  fullName: string;
  gender?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  signature?: string;
  salaryCode?: string;
  departmentId?: number;
  departmentName?: string;
  department?: string;
  positionId?: number;
  positionName?: string;
  position?: string;
  role?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Position {
  _id: string;
  name: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface DeviceType {
  _id: string;
  name: string;
  group: DeviceTypeEnum;
  createdAt?: string;
  updatedAt?: string;
}

export interface CargoGroup {
  _id: string;
  id?: number;
  name: string;
  code?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CargoType {
  _id: string;
  id?: number;
  name: string;
  code?: string;
  description?: string;
  cargoGroupId?: number;
  cargoGroupName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SafetyMeasure {
  _id: string;
  name: string;
  content: string;
  job?: string[];
  position?: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface Device {
  _id: string;
  name?: string;
  code: string;
  department: string;
  vehicleNumber?: string;
  category?: string;
  material?: string;
  fuelType?: string;
  capacity?: number;
  power?: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: StatusDeviceEnum;
  note?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  assignedTo: string;
  job: string;
  workingDate: Date;
  shift?: string;
  shiftHour?: string;
  startTime?: Date;
  endTime?: Date;
  assignedVehicles?: string[];
  repairDepartment?: string;
  device?: string[];
  repairVehicles?: {
    device?: string;
    note?: string;
  }[];
  excavator?: {
    device?: string;
    status: boolean;
  }[];
  location?: string[];
  material?: string[];
  workContent?: string;
  assistants?: string[];
  status: StatusOrderEnum;
  previous_order_id?: string;
  batchId?: string | null;
  note?: string;
  risk?: string;
  safetyMeasure?: string;
  safetyMeasureSpecific?: string;
  temporaryError?: string;
  department?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  _id: string;
  name: string;
  acceptedProduct?: string;
  density?: number;
  dryDensity?: number;
  valueHistory: {
    density?: number;
    dryDensity?: number;
    startTime: Date;
    endTime: Date;
  }[];
  createdAt?: string;
  updatedAt?: string;
}
export interface DeviceModel {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface TravelLog {
  _id: string;
  excavator?: string;
  workingDate?: Date;
  shift?: string;
  area?: string;
  location?: string;
  acceptedProduct?: AcceptedProductEnum;
  excavationLevel?: string;
  dumpHeightActual?: string;
  fullDistanceKm?: number;
  fullLiftHeightM?: number;
  localMinHeightM?: number;
  localMaxHeightM?: number;
  localDistanceKm?: number;
  localLiftHeightM?: number;
  createdAt?: string;
  updatedAt?: string;
}
export interface Job {
  _id: string;
  name: string;
  type: JobTypeEnum;
  createdAt?: string;
  updatedAt?: string;
}
export interface Shift {
  _id: string;
  name: number;
  startTime: string;
  endTime: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface ShiftReportType {
  _id: string;
  orderId: string;
  assignedTo: string;
  vehicleSummaries: {
    vehicle?: string;
    repairHours?: number;
    travelHours?: number;
    fuelRemain?: number;
    fuelReceived?: number;
    fuelRemainEnd?: number;
    status?: string;
    note?: string;
    gpsStatus?: string;
    sealStatus?: string;
  }[];
  handoverHours?: number;
  shiftHours?: number;
  handoverNotes?: string;
  risks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  _id: string;
  device: string;
  excavator?: string;
  fromLocation?: string;
  toLocation?: string;
  material?: string;
  distanceKm?: number;
  drillDepth?: number;
  hardnessF?: number;
  workingMinutes?: number;
  quantity?: number;
  quantityUpdateTimes?: {
    time?: Date;
    quantity?: number;
  }[];
}
export interface Location {
  _id: string;
  name: string;
  distance: number; // in meters
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  recipient: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const parsePaginatedResponse = <T>(res: any): PaginatedResponse<T> => {
  const data = res.data?.data || res.data?.result || res.data;
  if (data && Array.isArray(data.content)) {
    return {
      content: data.content,
      page: data.page ?? 0,
      size: data.size ?? data.content.length,
      totalElements: data.totalElements ?? data.content.length,
      totalPages: data.totalPages ?? 1,
      last: data.last ?? true,
    };
  }
  if (Array.isArray(data)) {
    return {
      content: data,
      page: 0,
      size: data.length,
      totalElements: data.length,
      totalPages: 1,
      last: true,
    };
  }
  return {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };
};

export interface SystemInfo {
  cpu: number[]; // CPU usage history
  ram: {
    total: number;
    free: number;
    used: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
  };
}
