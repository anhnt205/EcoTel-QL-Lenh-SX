export interface ShiftItem {
  _id: string;
  name: string;
  startTime?: string;
  endTime?: string;
}

export interface DepartmentItem {
  _id: string;
  code: string;
  name?: string;
}

export interface TruckItem {
  _id: string;
  code: string;
  group?: string;
  source?: string;
  quality?: string;
  capacity?: number;
  department?: DepartmentItem;
}

export interface ExcavatorItem {
  _id: string;
  code: string;
  group?: string;
  source?: string;
}

export interface LocationItem {
  _id: string;
  name: string;
  symbol: string;
  type?: string;
}

export interface MaterialItem {
  _id: string;
  name: string;
  symbol: string;
  acceptedProduct?: string;
}

export interface UserItem {
  _id: string;
  fullName: string;
  salaryCode: string;
  department?: DepartmentItem;
}

export interface InitDataResponse {
  shifts: ShiftItem[];
  trucks: TruckItem[];
  excavators: ExcavatorItem[];
  locations: LocationItem[];
  materials: MaterialItem[];
  users: UserItem[];
}

export interface StatisticRow {
  _id: string;
  workingDate: string;
  shift: ShiftItem | string;
  device?: TruckItem;
  driver?: UserItem;
  staff?: UserItem;
  excavator?: ExcavatorItem;
  fromLocation?: LocationItem;
  toLocation?: LocationItem;
  material?: MaterialItem;
  loadingModel?: string;
  quantity?: number;
  totalTon?: number;
  underload?: number;
  ton?: number;
  cubicMeter?: number;
  production?: number;
  loadingHeight?: number;
  tripTimes?: string[];
  vehicleSource?: string;
  initialGas?: number;
  additionalGas?: number;
  finalGas?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StatisticListResponse {
  data: StatisticRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BatchSaveRequest {
  records: Partial<StatisticRow>[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  result?: T;
  data?: T;
}
