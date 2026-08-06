import api from "@/config/api.config";

const ModelService = {
  getModels: async (params?: Record<string, any>): Promise<any[]> => {
    const res = await api.get("/models", { params });
    return res.data.data;
  },
  bulkUpsert: async (payload: {
    rows: any[];
    startTime: Date;
    endTime: Date;
    initSlot?: any;
  }): Promise<any> => {
    const res = await api.post("/models/bulk-upsert", payload);
    return res.data;
  },
};

export default ModelService;
