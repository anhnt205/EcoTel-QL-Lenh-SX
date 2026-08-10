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
}

export interface CargoGroupApiItem {
  id: number;
  name: string;
  cargoTypeId?: number;
  cargoTypeName?: string;
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
  const res = await api.get(API.MASTER_DATA.SHIFTS);
  return extractData<ShiftApiItem>(res);
};

export const fetchDepartments = async (): Promise<DepartmentApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.DEPARTMENTS);
  return extractData<DepartmentApiItem>(res);
};

export const fetchLocations = async (): Promise<LocationApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.LOCATIONS);
  return extractData<LocationApiItem>(res);
};

export const fetchDevices = async (): Promise<DeviceApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.DEVICES);
  return extractData<DeviceApiItem>(res);
};

export const fetchMaterials = async (): Promise<MaterialApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.MATERIALS);
  return extractData<MaterialApiItem>(res);
};

export const fetchUsers = async (): Promise<UserApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.USERS);
  return extractData<UserApiItem>(res);
};

export const fetchCargoTypes = async (): Promise<CargoTypeApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.CARGO_TYPES);
  return extractData<CargoTypeApiItem>(res);
};

export const fetchCargoGroups = async (): Promise<CargoGroupApiItem[]> => {
  const res = await api.get(API.MASTER_DATA.CARGO_GROUPS);
  return extractData<CargoGroupApiItem>(res);
};
