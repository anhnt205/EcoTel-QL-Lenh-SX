import api from "@/lib/axios";
import { API } from "@/constants/api-endpoint";

export interface ShiftApiItem {
  id: number;
  name: number | string;
  startTime?: string;
  endTime?: string;
}

export interface DepartmentApiItem {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface LocationApiItem {
  id: number;
  name: string;
  distance?: number;
  longitude?: number;
  latitude?: number;
}

export interface DeviceApiItem {
  id: number;
  code: string;
  name: string;
  vehicleNumber?: string;
  categoryId?: number;
  categoryName?: string;
  categoryGroup?: string;
  departmentId?: number;
  departmentName?: string;
  materialId?: number;
  materialName?: string;
  fuelType?: string;
  status?: string;
}

export interface MaterialApiItem {
  id: number;
  name: string;
  acceptedProduct?: string;
}

export interface UserApiItem {
  id: number;
  username: string;
  fullName: string;
  salaryCode: string;
  departmentId?: number;
  departmentName?: string;
  positionId?: number;
  positionName?: string;
}

export interface CargoTypeApiItem {
  id: number;
  name: string;
  cargoGroupId?: number;
  cargoGroupName?: string;
}

export interface CargoGroupApiItem {
  id: number;
  name: string;
}

export interface ExcavationAreaApiItem {
  id: number;
  code?: string;
  name: string;
  note?: string;
}

export interface ReceivingPointApiItem {
  id: number;
  code?: string;
  name: string;
  seamGroupId?: number;
  seamGroupName?: string;
  note?: string;
}

export interface UnloadingPointApiItem {
  id: number;
  code?: string;
  name: string;
  note?: string;
}

/**
 * "Nơi chất tải" của phiếu báo chuyến Khai thác — danh mục Pickup Point
 * (`/api/pickup-points`, bảng `pickup_points`), KHÔNG PHẢI danh mục
 * "Locations" chung (`/api/locations`, bảng `locations`).
 *
 * Hai bảng này TÌNH CỜ có những dòng trùng TÊN (cả hai đều có "KX1".."KX4")
 * nhưng ID KHÁC NHAU hẳn — `ExcavationReportService.create()` xác thực
 * `receivingLocationId` qua `pickupPointRepository`, nên nếu dropdown lấy
 * nhầm từ `/api/locations` thì save sẽ luôn 404 "Nơi chất tải không tồn
 * tại: <id sai>" (đã xảy ra thật, vá ngày 2026-09-08 — xem
 * `useMasterData.ts` và `MiningBatchEntryModal.tsx`).
 */
export interface PickupPointApiItem {
  id: number;
  code?: string;
  name: string;
  note?: string;
}

const extractData = <T>(res: any): T[] => {
  if (!res || !res.data) return [];
  // Spring Boot ApiResponse wrapping: { status: 200, success: true, data: [...] }
  if (res.data.data && Array.isArray(res.data.data)) {
    return res.data.data;
  }
  // Spring Data Page wrapping: { content: [...] }
  if (res.data.data && Array.isArray(res.data.data.content)) {
    return res.data.data.content;
  }
  if (Array.isArray(res.data)) {
    return res.data;
  }
  return [];
};

export const fetchShifts = async (): Promise<ShiftApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.SHIFTS, { params: { size: 1000 } });
  return extractData<ShiftApiItem>(res);
};

export const fetchDepartments = async (): Promise<DepartmentApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.DEPARTMENTS, { params: { size: 1000 } });
  return extractData<DepartmentApiItem>(res);
};

export const fetchLocations = async (): Promise<LocationApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.LOCATIONS, { params: { size: 1000 } });
  return extractData<LocationApiItem>(res);
};

export const fetchDevices = async (): Promise<DeviceApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.DEVICES, { params: { size: 1000 } });
  return extractData<DeviceApiItem>(res);
};

export const fetchExcavators = async (): Promise<DeviceApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.DEVICES, {
    params: { categoryGroup: "MAY", categoryName: "Máy xúc", size: 1000 },
  });
  return extractData<DeviceApiItem>(res);
};

export const fetchTransportVehicles = async (): Promise<DeviceApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.DEVICES, {
    params: { categoryGroup: "XE", size: 1000 },
  });
  return extractData<DeviceApiItem>(res);
};

export const fetchMaterials = async (): Promise<MaterialApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.MATERIALS, { params: { size: 1000 } });
  return extractData<MaterialApiItem>(res);
};

export const fetchUsers = async (): Promise<UserApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.USERS, { params: { size: 1000 } });
  return extractData<UserApiItem>(res);
};

export const fetchCargoTypes = async (): Promise<CargoTypeApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.CARGO_TYPES, { params: { size: 1000 } });
  return extractData<CargoTypeApiItem>(res);
};

export const fetchCargoGroups = async (): Promise<CargoGroupApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.CARGO_GROUPS, { params: { size: 1000 } });
  return extractData<CargoGroupApiItem>(res);
};

export const fetchExcavationAreas = async (): Promise<ExcavationAreaApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.EXCAVATION_AREAS, { params: { size: 1000 } });
  return extractData<ExcavationAreaApiItem>(res);
};

export const fetchReceivingPoints = async (): Promise<ReceivingPointApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.RECEIVING_POINTS, { params: { size: 1000 } });
  return extractData<ReceivingPointApiItem>(res);
};

export const fetchUnloadingPoints = async (): Promise<UnloadingPointApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.UNLOADING_POINTS, { params: { size: 1000 } });
  return extractData<UnloadingPointApiItem>(res);
};

/** "Nơi chất tải" của báo chuyến Khai thác — xem javadoc {@link PickupPointApiItem}. */
export const fetchPickupPoints = async (): Promise<PickupPointApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.PICKUP_POINTS, { params: { size: 1000 } });
  return extractData<PickupPointApiItem>(res);
};
