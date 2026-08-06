import axiosInstance from '@/lib/axios';
import { API } from '@/constants/api-endpoint';
import type {
  DashboardResponse,
  FuelFilters,
  FuelReconciliationResponse,
  ProductionFilters,
  ProductionReconciliationResponse,
} from '@/modules/reconciliation/types/reconciliation.types';

export const reconciliationService = {
  // === Đối chiếu sản lượng ===
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
