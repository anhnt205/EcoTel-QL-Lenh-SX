import axiosInstance from '@/lib/axios';
import { API } from '@/constants/api-endpoint';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DashboardResponse,
  FuelFilters,
  FuelReconciliationResponse,
  ProductionFilters,
  ProductionReconciliationResponse,
} from '@/modules/reconciliation/types/reconciliation.types';
import type { ApprovalStatus, ReconciliationItem } from '@/modules/dataentry/types/thong-ke';

// ─── Types cho API Đối chiếu Báo chuyến mới ──────────────────────────────────
export interface ReconciliationSearchParams {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  shiftIds?: number[];
  deviceIds?: number[];
  excavatorIds?: number[];
  status?: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED' | ApprovalStatus;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface ReconciliationTripDataResponse {
  cargoTypeName?: string;
  tripCount?: number;
  loadLevelType?: string;
  loadLevelCustomValue?: string;
  employeeSalaryCode?: string;
  employeeFullName?: string;
  status?: ApprovalStatus;
  note?: string;
}

export interface ReconciliationDecisionResponse {
  status: ApprovalStatus;
  note?: string;
}

export interface ReconciliationRowResponse {
  transportReportTripId?: number;
  excavationReportTripId?: number;
  transportReportId?: number;   // report-level ID
  excavationReportId?: number;  // report-level ID
  reportDate: string;
  shiftName: number | string;
  vehicleCode: string;
  excavationAreaName?: string;
  excavatorName?: string;
  loadingPointName?: string;
  unloadingFloor?: string;
  receivingFloor?: number;
  totalRouteDistanceKm?: number;
  totalRouteLiftM?: number;
  localSlopeDistanceKm?: number;
  localSlopeM?: number;
  unloadingPointName?: string;
  rainyDay?: boolean;
  supplementaryVehicle?: boolean;
  transportData?: ReconciliationTripDataResponse;
  excavationData?: ReconciliationTripDataResponse;
  matched: boolean;
  decision?: ReconciliationDecisionResponse;
  status?: ApprovalStatus;
  resolvedData?: ReconciliationTripDataResponse;
}

export interface ReconciliationDecisionRequest {
  transportReportTripId?: number;
  excavationReportTripId?: number;
  status: ApprovalStatus;
  note?: string;
}

export interface BulkReconciliationDecisionRequest {
  decisions: ReconciliationDecisionRequest[];
}

export interface ReconciliationTripUpdateRequest {
  transportReportTripId?: number;
  excavationReportTripId?: number;
  cargoTypeId: number;
  tripCount: number;
  loadLevelType: 'FULL_LOAD' | 'RODA_2_3' | 'OTHER';
  loadLevelCustomValue?: string;
  newReportDate?: string;
  newShiftId?: number;
  newVehicleId?: number;
}

export interface ReportStatusUpdateRequest {
  reportType: 'TRANSPORT' | 'EXCAVATION';
  tripId: number;
  status: ApprovalStatus;
  note?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiResponse<T> {
  code?: number;
  message?: string;
  result: T;
}

// ─── Service API ──────────────────────────────────────────────────────────────
export const reconciliationService = {
  // GET /api/reconciliation
  searchReconciliation: async (
    params: ReconciliationSearchParams
  ): Promise<PageResponse<ReconciliationRowResponse>> => {
    const queryParams: Record<string, any> = {
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: params.page ?? 0,
      size: params.size ?? 200,
    };
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.shiftIds && params.shiftIds.length > 0) {
      queryParams.shiftIds = params.shiftIds.join(',');
    }
    if (params.deviceIds && params.deviceIds.length > 0) {
      queryParams.deviceIds = params.deviceIds.join(',');
    }
    if (params.excavatorIds && params.excavatorIds.length > 0) {
      queryParams.excavatorIds = params.excavatorIds.join(',');
    }
    if (params.sort && params.sort.length > 0) {
      queryParams.sort = params.sort;
    }

    const response = await axiosInstance.get(
      API.RECONCILIATION.SEARCH,
      { params: queryParams }
    );
    const res = response.data as any;
    return res?.data || res?.result || res;
  },

  // POST /api/reconciliation/decisions (Yêu cầu sửa 1 chuyến đối chiếu)
  saveDecision: async (
    payload: ReconciliationDecisionRequest
  ): Promise<ReconciliationDecisionResponse> => {
    const response = await axiosInstance.post(
      API.RECONCILIATION.DECISIONS,
      payload
    );
    const res = response.data as any;
    return res?.data || res?.result || res;
  },

  // POST /api/reconciliation/decisions/bulk (Yêu cầu sửa nhiều chuyến đối chiếu cùng lúc)
  saveDecisionsBulk: async (
    payload: BulkReconciliationDecisionRequest
  ): Promise<ReconciliationDecisionResponse[]> => {
    const response = await axiosInstance.post(
      API.RECONCILIATION.DECISIONS_BULK,
      payload
    );
    const res = response.data as any;
    return res?.data || res?.result || res;
  },

  // PUT /api/reconciliation/trips/bulk (Cập nhật dữ liệu chuyến)
  updateTripsBulk: async (
    payload: ReconciliationTripUpdateRequest[]
  ): Promise<void> => {
    await axiosInstance.put(
      API.RECONCILIATION.TRIPS_BULK,
      payload
    );
  },

  // PUT /api/reconciliation/report-status (Duyệt 1 báo cáo ca)
  updateReportStatus: async (
    payload: ReportStatusUpdateRequest
  ): Promise<void> => {
    await axiosInstance.put(
      API.RECONCILIATION.REPORT_STATUS,
      payload
    );
  },

  // PUT /api/reconciliation/report-status/batch (Duyệt hàng loạt nhiều báo cáo ca)
  updateReportStatusBatch: async (
    payload: ReportStatusUpdateRequest[]
  ): Promise<void> => {
    await axiosInstance.put(
      API.RECONCILIATION.REPORT_STATUS_BATCH,
      payload
    );
  },

  // === Đối chiếu sản lượng cũ ===
  getProduction: async (
    params: ProductionFilters
  ): Promise<ProductionReconciliationResponse> => {
    const response = await axiosInstance.get(API.RECONCILIATION.PRODUCTION.LIST, {
      params,
    });
    return response.data;
  },

  exportProduction: async (params: ProductionFilters): Promise<Blob> => {
    const response = await axiosInstance.get(API.RECONCILIATION.PRODUCTION.EXPORT, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // === Đối chiếu nhiên liệu ===
  getFuel: async (params: FuelFilters): Promise<FuelReconciliationResponse> => {
    const response = await axiosInstance.get(API.RECONCILIATION.FUEL.LIST, {
      params,
    });
    return response.data;
  },

  exportFuel: async (params: FuelFilters): Promise<Blob> => {
    const response = await axiosInstance.get(API.RECONCILIATION.FUEL.EXPORT, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // === Dashboard tổng hợp ===
  getDashboard: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<DashboardResponse> => {
    const response = await axiosInstance.get(API.RECONCILIATION.DASHBOARD, {
      params,
    });
    return response.data;
  },
};

// ─── React Query Hooks ────────────────────────────────────────────────────────
export const RECONCILIATION_QUERY_KEY = 'reconciliation-search';

export function useReconciliationSearchQuery(params: ReconciliationSearchParams, enabled = true) {
  return useQuery({
    queryKey: [RECONCILIATION_QUERY_KEY, params],
    queryFn: () => reconciliationService.searchReconciliation(params),
    enabled: enabled && Boolean(params.fromDate && params.toDate),
  });
}

// Yêu cầu sửa 1 chuyến đối chiếu
export function useSaveReconciliationDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReconciliationDecisionRequest) => reconciliationService.saveDecision(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECONCILIATION_QUERY_KEY] });
    },
  });
}

// Yêu cầu sửa nhiều chuyến đối chiếu
export function useSaveReconciliationDecisionsBulkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkReconciliationDecisionRequest) => reconciliationService.saveDecisionsBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECONCILIATION_QUERY_KEY] });
    },
  });
}

export function useUpdateReconciliationTripsBulkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReconciliationTripUpdateRequest[]) => reconciliationService.updateTripsBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECONCILIATION_QUERY_KEY] });
    },
  });
}

// Duyệt 1 báo cáo ca (report level)
export function useUpdateReportStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportStatusUpdateRequest) => reconciliationService.updateReportStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECONCILIATION_QUERY_KEY] });
    },
  });
}

// Duyệt hàng loạt nhiều báo cáo ca (report level batch)
export function useUpdateReportStatusBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportStatusUpdateRequest[]) => reconciliationService.updateReportStatusBatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECONCILIATION_QUERY_KEY] });
    },
  });
}

// ─── Mapper từ API Response sang ReconciliationItem UI ─────────────────────────
export function mapRowResponseToReconciliationItem(
  row: ReconciliationRowResponse,
  index: number
): ReconciliationItem & { backendRow: ReconciliationRowResponse } {
  const dateParts = (row.reportDate || '').split('-');
  const month = dateParts[1] ? Number(dateParts[1]) : 8;
  const day = dateParts[2] ? Number(dateParts[2]) : 1;

  const mapLoadLevel = (type?: string, customVal?: string) => {
    if (!type) return 'Đủ tải';
    if (type === 'FULL_LOAD') return 'Đủ tải';
    if (type === 'RODA_2_3') return 'Roda (2/3)';
    if (customVal) return `Khác (${customVal})`;
    return 'Khác';
  };

  const transportRecord = row.transportData
    ? {
        cargoType: row.transportData.cargoTypeName || 'Than',
        tripCount: row.transportData.tripCount || 0,
        loadStatus: mapLoadLevel(
          row.transportData.loadLevelType,
          row.transportData.loadLevelCustomValue
        ),
        operatorBadgeNo: row.transportData.employeeSalaryCode || '',
        employeeFullName: row.transportData.employeeFullName || '',
        excavationArea: row.excavationAreaName || '',
        excavatorEquipment: row.excavatorName || '',
        pickupLocation: row.loadingPointName || '',
        unloadBench: row.unloadingFloor || '',
        pickupBench: row.receivingFloor ? String(row.receivingFloor) : '',
        fullRouteDistance: row.totalRouteDistanceKm ?? 0,
        fullRouteElevate: row.totalRouteLiftM ?? 0,
        localSlopeDist: row.localSlopeDistanceKm ?? 0,
        localSlopeDegree: row.localSlopeM ?? 0,
        unloadLocationName: row.unloadingPointName || '',
        isRainyDay: row.rainyDay ?? false,
        isTraineeVehicle: row.supplementaryVehicle ?? false,
      }
    : undefined;

  const miningRecord = row.excavationData
    ? {
        material: row.excavationData.cargoTypeName || 'Than',
        tripCount: row.excavationData.tripCount || 0,
        loadStatus: mapLoadLevel(
          row.excavationData.loadLevelType,
          row.excavationData.loadLevelCustomValue
        ),
        operatorBadgeNo: row.excavationData.employeeSalaryCode || '',
        employeeFullName: row.excavationData.employeeFullName || '',
        mineCode: row.excavatorName || '',
        dumpLocation: row.unloadingPointName || '',
        pickupLocation: row.loadingPointName || '',
      }
    : undefined;

  const rowId = row.transportReportTripId
    ? `VT_${row.transportReportTripId}`
    : `KT_${row.excavationReportTripId}_${index}`;

  const status = row.transportData && row.excavationData
    ? 'BOTH'
    : row.transportData
      ? 'TRANSPORT_ONLY'
      : 'MINING_ONLY';

  const reconciliationStatus: ApprovalStatus =
    row.status ||
    row.decision?.status ||
    (row.transportData?.status === 'APPROVED' || row.excavationData?.status === 'APPROVED' ? 'APPROVED' : undefined) ||
    'PENDING';
  const requestNote: string | undefined = row.decision?.note || row.transportData?.note || row.excavationData?.note;

  return {
    id: rowId,
    commonKey: {
      day,
      month,
      shift: row.shiftName ? `Ca ${row.shiftName}` : 'Ca 1',
      vehicleNo: row.vehicleCode || '',
      tripCount: row.transportData?.tripCount || row.excavationData?.tripCount || 0,
      cargoType: row.transportData?.cargoTypeName || row.excavationData?.cargoTypeName || '',
      fleet: '',
    },
    transportRecord,
    miningRecord,
    status,
    reconciliationStatus,
    requestNote,
    backendRow: row,
  };
}

// ─── Mapper từ API Response sang StandardTripReport UI (cho trang Báo chuyến chốt) ───
export function mapRowResponseToStandardTripReport(
  row: ReconciliationRowResponse,
  index: number
) {
  const mapLoadLevel = (type?: string, customVal?: string) => {
    if (!type) return 'Đủ tải';
    if (type === 'FULL_LOAD') return 'Đủ tải';
    if (type === 'RODA_2_3') return 'Roda (2/3)';
    if (customVal) return `Khác (${customVal})`;
    return 'Khác';
  };

  const status: ApprovalStatus =
    row.status ||
    row.decision?.status ||
    (row.transportData?.status === 'APPROVED' || row.excavationData?.status === 'APPROVED' ? 'APPROVED' : undefined) ||
    'PENDING';
  const finalOptionLabel =
    status === 'APPROVED'
      ? 'Đã duyệt'
      : status === 'REVISION_REQUESTED'
        ? 'Cần sửa'
        : 'Chờ đối soát';

  const resolved = row.resolvedData;

  const cargoType =
    resolved?.cargoTypeName ||
    row.transportData?.cargoTypeName ||
    row.excavationData?.cargoTypeName ||
    'Than';

  const tripCount =
    resolved?.tripCount ??
    row.transportData?.tripCount ??
    row.excavationData?.tripCount ??
    0;

  const loadStatus = mapLoadLevel(
    resolved?.loadLevelType || row.transportData?.loadLevelType || row.excavationData?.loadLevelType,
    resolved?.loadLevelCustomValue || row.transportData?.loadLevelCustomValue || row.excavationData?.loadLevelCustomValue
  );

  const rowId = row.transportReportTripId
    ? `VT_${row.transportReportTripId}`
    : `KT_${row.excavationReportTripId}_${index}`;

  return {
    id: rowId,
    reportDate: row.reportDate,
    shift: typeof row.shiftName === 'number' ? `Ca ${row.shiftName}` : (row.shiftName || 'Ca 1'),
    vehicleNo: row.vehicleCode || '-',
    excavationArea: row.excavationAreaName || '-',
    excavatorEquipment: row.excavatorName || '-',
    pickupLocation: row.loadingPointName || '-',
    pickupBench: row.receivingFloor ? String(row.receivingFloor) : '-',
    unloadLocationName: row.unloadingPointName || '-',
    unloadBench: row.unloadingFloor || '-',
    fullRouteDistance: row.totalRouteDistanceKm ?? 0,
    fullRouteElevate: row.totalRouteLiftM ?? 0,
    operatorBadgeNo:
      resolved?.employeeSalaryCode ||
      row.transportData?.employeeSalaryCode ||
      row.excavationData?.employeeSalaryCode ||
      '-',
    isRainyDay: row.rainyDay ?? false,
    isTraineeVehicle: row.supplementaryVehicle ?? false,
    finalOption: 'TRANSPORT' as const,
    finalOptionLabel,
    cargoType,
    tripCount,
    loadStatus,
    approvedAt: row.reportDate,
    status,
  };
}
