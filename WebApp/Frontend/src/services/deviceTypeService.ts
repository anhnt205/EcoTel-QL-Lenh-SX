import { useQuery } from "@tanstack/react-query";
import api from "../config/api.config";
import { Device, DeviceType, Job, ListParams, ListResponse, Location, Position } from "../types";

const DeviceTypeService = {
    getAll: async (params?: ListParams): Promise<ListResponse> => {
        const res = await api.get('/devicetypes', { params });
        return res.data
    },
    create: async (data: Partial<DeviceType>): Promise<any> => {
        const res = await api.post('/devicetypes', data);
        return res.data
    },
    update: async (data: Partial<DeviceType>): Promise<any> => {
        const res = await api.put(`/devicetypes/${data?._id}`, data);
        return res.data
    },
    delete: async (ids: string[]): Promise<any> => {
        const res = await api.delete(`/devicetypes`, { data: { ids } });
        return res.data.message
    },
};

export default DeviceTypeService;