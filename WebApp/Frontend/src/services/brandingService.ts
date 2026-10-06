import api from "../config/api.config";

// Cấu hình giao diện do máy chủ trả về (KHÔNG chứa nội dung logo, chỉ cờ + phiên bản để cache URL ảnh)
export interface BrandingRaw {
  softwareName: string;
  companyName: string;
  primaryColor: string;
  hasLogo: boolean;
  logoVersion: number | null;
}

// Trường nào vắng mặt thì giữ nguyên; chuỗi rỗng / null thì xoá về mặc định
export interface BrandingPayload {
  softwareName?: string;
  companyName?: string;
  primaryColor?: string;
  logo?: string | null; // data URL của ảnh logo
}

const BrandingService = {
  get: async (): Promise<BrandingRaw> => {
    const res = await api.get("/settings/branding");
    return res.data.data;
  },
  save: async (payload: BrandingPayload): Promise<BrandingRaw> => {
    const res = await api.put("/settings/branding", payload);
    return res.data.data;
  },
  reset: async (): Promise<BrandingRaw> => {
    const res = await api.delete("/settings/branding");
    return res.data.data;
  },
  logoUrl: (version: number | null): string =>
    `${api.defaults.baseURL}/settings/branding/logo?v=${version ?? 1}`,
};

export default BrandingService;
