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
import type { ReconciliationItem } from '@/modules/dataentry/types/thong-ke';

// ─── Types cho API Đối chiếu Báo chuyến mới ──────────────────────────────────
export interface ReconciliationSearchParams {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  shiftIds?: number[];
  deviceIds?: number[];
  page?: number;
  size?: number;
}

export interface ReconciliationTripDataResponse {
  cargoTypeName?: string;
  tripCount?: number;
  loadLevelType?: string;
  loadLevelCustomValue?: string;
  employeeSalaryCode?: string;
}

export interface ReconciliationDecisionResponse {
  finalOption: 'TRANSPORT' | 'EXCAVATION' | 'OTHER';
  customCargoTypeName?: string;
  customTripCount?: number;
  customLoadLevelType?: string;
  customLoadLevelCustomValue?: string;
}

export interface ReconciliationRowResponse {
  transportReportTripId?: number;
  excavationReportTripId?: number;
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
}

export interface ReconciliationDecisionRequest {
  transportReportTripId?: number;
  excavationReportTripId?: number;
  finalOption: 'TRANSPORT' | 'EXCAVATION' | 'OTHER';
  customCargoTypeId?: number;
  customTripCount?: number;
  customLoadLevelType?: 'FULL_LOAD' | 'RODA_2_3' | 'OTHER';
  customLoadLevelCustomValue?: string;
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
    if (params.shiftIds && params.shiftIds.length > 0) {
      queryParams.shiftIds = params.shiftIds.join(',');
    }
    if (params.deviceIds && params.deviceIds.length > 0) {
      queryParams.deviceIds = params.deviceIds.join(',');
    }

    const response = await axiosInstance.get<ApiResponse<PageResponse<ReconciliationRowResponse>>>(
      API.RECONCILIATION.SEARCH,
      { params: queryParams }
    );
    return response.data.result;
  },

  // POST /api/reconciliation/decisions
  saveDecision: async (
    payload: ReconciliationDecisionRequest
  ): Promise<ReconciliationDecisionResponse> => {
    const response = await axiosInstance.post<ApiResponse<ReconciliationDecisionResponse>>(
      API.RECONCILIATION.DECISIONS,
      payload
    );
    return response.data.result;
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

export function useSaveReconciliationDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReconciliationDecisionRequest) => reconciliationService.saveDecision(payload),
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
    backendRow: row,
  };
}
