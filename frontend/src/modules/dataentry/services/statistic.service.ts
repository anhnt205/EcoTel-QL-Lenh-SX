import api from '@/lib/axios';
import { API } from '@/constants/api-endpoint';
import type {
  StatisticListResponse,
  InitDataResponse,
  BatchSaveRequest,
  ApiResponse,
} from '@/modules/dataentry/types/statistic.types';

export const statisticService = {
  // Danh sách phiếu thống kê
  list: async (params: {
    page?: number;
    limit?: number;
    startTime?: string;
    endTime?: string;
    vehicleSource?: string;
    shift?: string;
    vehicleCode?: string;
  }): Promise<StatisticListResponse> => {
    const response = await api.get(API.STATISTICS.LIST, { params });
    return response.data;
  },

  // Dữ liệu dropdown (trucks, excavators, locations, materials, users)
  getInitData: async (): Promise<InitDataResponse> => {
    const response = await api.get(API.STATISTICS.INIT_DATA);
    return response.data.result;
  },

  // Tạo mới phiếu
  batchSave: async (data: BatchSaveRequest): Promise<ApiResponse<unknown>> => {
    const response = await api.post(API.STATISTICS.BATCH_SAVE, data);
    return response.data;
  },

  // Cập nhật phiếu
  batchUpdate: async (
    reportId: string,
    data: BatchSaveRequest
  ): Promise<ApiResponse<unknown>> => {
    const response = await api.put(
      API.STATISTICS.BATCH_UPDATE(reportId),
      data
    );
    return response.data;
  },

  // Xóa nhiều phiếu
  batchDelete: async (ids: string[]): Promise<ApiResponse<unknown>> => {
    const response = await api.delete(API.STATISTICS.BATCH_DELETE, {
      data: { ids },
    });
    return response.data;
  },

  // Xuất Excel
  export: async (params: {
    startTime: string;
    endTime: string;
    vehicleSource?: string;
  }): Promise<Blob> => {
    const response = await api.post(API.STATISTICS.EXPORT, params, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Nhập Excel
  import: async (file: File): Promise<ApiResponse<unknown>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(API.STATISTICS.IMPORT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Lấy nhiên liệu theo ca/xe
  getShiftFuel: async (params: {
    workingDate: string;
    shift: string;
    vehicleId: string;
  }): Promise<ApiResponse<unknown>> => {
    const response = await api.get(API.STATISTICS.SHIFT_FUEL, { params });
    return response.data;
  },
};
