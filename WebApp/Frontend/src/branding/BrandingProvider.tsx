import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThemeProvider, darken } from "@mui/material/styles";
import { ConfigProvider } from "antd";
import BrandingService, { BrandingRaw } from "../services/brandingService";
import { buildAppTheme, DEFAULT_PRIMARY } from "../theme";

// Giá trị mặc định (dùng khi quản trị viên chưa tuỳ chỉnh trong Hệ thống > Cấu hình giao diện)
export const DEFAULT_LOGO = "/image/logo.png";
export const DEFAULT_HEADER_TITLE = "ĐIỀU PHỐI MÁY MÓC THIẾT BỊ";
export const DEFAULT_LOGIN_TITLE =
  "HỆ THỐNG QUẢN LÝ ĐIỀU PHỐI VÀ SỬ DỤNG MÁY MÓC THIẾT BỊ";
export const DEFAULT_DOCUMENT_TITLE =
  "Hệ thống quản lý điều phối và sử dụng máy móc thiết bị";
export const DEFAULT_COMPANY = "CÔNG TY CP THAN CAO SƠN - TKV";
export { DEFAULT_PRIMARY };

const CACHE_KEY = "branding_cache";
const EMPTY: BrandingRaw = {
  softwareName: "",
  companyName: "",
  primaryColor: "",
  hasLogo: false,
  logoVersion: null,
};

// Lần mở trang sau dùng ngay cấu hình đã lưu để không bị chớp giao diện mặc định trước khi máy chủ trả lời
const readCache = (): BrandingRaw | undefined => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : undefined;
  } catch {
    return undefined;
  }
};
const writeCache = (raw: BrandingRaw) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
  } catch {
    // không có localStorage (chế độ riêng tư...) thì bỏ qua
  }
};

export interface Branding {
  raw: BrandingRaw;
  logoUrl: string;
  hasCustomLogo: boolean;
  /** Tên phần mềm do quản trị đặt ("" = dùng tên mặc định) */
  softwareName: string;
  headerTitle: string;
  loginTitle: string;
  documentTitle: string;
  companyName: string;
  primaryColor: string;
  hasCustomColor: boolean;
}

export const resolveBranding = (raw: BrandingRaw): Branding => ({
  raw,
  logoUrl: raw.hasLogo ? BrandingService.logoUrl(raw.logoVersion) : DEFAULT_LOGO,
  hasCustomLogo: raw.hasLogo,
  softwareName: raw.softwareName,
  headerTitle: raw.softwareName || DEFAULT_HEADER_TITLE,
  loginTitle: raw.softwareName || DEFAULT_LOGIN_TITLE,
  documentTitle: raw.softwareName || DEFAULT_DOCUMENT_TITLE,
  companyName: raw.companyName || DEFAULT_COMPANY,
  primaryColor: raw.primaryColor || DEFAULT_PRIMARY,
  hasCustomColor: Boolean(raw.primaryColor),
});

// Màu của Header / giao diện mới theo màu chủ đạo. Chưa tuỳ chỉnh (màu mặc định) thì giữ ĐÚNG màu đã
// duyệt theo ảnh mẫu (navy #0f2a55, xanh #1d6ff2); màu tuỳ chỉnh thì dùng màu đó, nền thanh trên làm đậm.
const isDefaultPrimary = (primary: string) =>
  primary.toLowerCase() === DEFAULT_PRIMARY;
export const brandAccent = (primary: string) =>
  isDefaultPrimary(primary) ? "#1d6ff2" : primary;
export const brandNavy = (primary: string) =>
  isDefaultPrimary(primary) ? "#0f2a55" : darken(primary, 0.6);

const BrandingContext = createContext<Branding>(resolveBranding(EMPTY));

export const useBranding = () => useContext(BrandingContext);

/**
 * Lấy cấu hình giao diện từ máy chủ rồi áp cho cả ứng dụng: theme MUI (màu chủ đạo), màu của antd,
 * tiêu đề tab trình duyệt, biểu tượng tab; logo/tên/công ty đọc qua useBranding().
 * Máy chủ chưa có API / lỗi mạng thì dùng bản đã lưu hoặc mặc định.
 */
export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["branding"],
    queryFn: BrandingService.get,
    initialData: readCache,
    initialDataUpdatedAt: 0, // dữ liệu cache coi như đã cũ: vẫn tải lại ngay
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const raw = data ?? EMPTY;
  const branding = useMemo(() => resolveBranding(raw), [raw]);

  useEffect(() => {
    writeCache(raw);
  }, [raw]);

  const muiTheme = useMemo(
    () => buildAppTheme(branding.primaryColor),
    [branding.primaryColor],
  );

  // Tiêu đề tab trình duyệt + biểu tượng tab theo logo
  useEffect(() => {
    document.title = branding.documentTitle;
  }, [branding.documentTitle]);
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) return;
    if (!link.dataset.defaultHref) link.dataset.defaultHref = link.href;
    link.href = branding.hasCustomLogo ? branding.logoUrl : link.dataset.defaultHref;
  }, [branding.hasCustomLogo, branding.logoUrl]);

  return (
    <BrandingContext.Provider value={branding}>
      <ThemeProvider theme={muiTheme}>
        <ConfigProvider
          theme={{
            token: {
              fontFamily: "'Times New Roman', Times, serif",
              ...(branding.hasCustomColor ? { colorPrimary: branding.primaryColor } : {}),
            },
          }}
        >
          {children}
        </ConfigProvider>
      </ThemeProvider>
    </BrandingContext.Provider>
  );
}
