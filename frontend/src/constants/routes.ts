export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/sign-in',
  },
  DASHBOARD: '/',
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
  STATISTICS: {
    INTERNAL_TRUCKS: '/statistics/internal-trucks',
    EXTERNAL_TRUCKS: '/statistics/external-trucks',
  },
  RECONCILIATION: {
    PRODUCTION: '/nhap-lieu/doi-chieu',
    FUEL: '/nhap-lieu/doi-chieu',
    DASHBOARD: '/nhap-lieu/doi-chieu',
  },
  REPORTS: {
    INTERNAL_TRUCKS: '/nhap-lieu/van-tai',
    EXTERNAL_TRUCKS: '/nhap-lieu/van-tai',
    PRODUCTION_ANALYSIS: '/nhap-lieu/van-tai',
    SUMMARY: '/nhap-lieu/van-tai',
  },
  DATA_ENTRY: {
    TRANSPORT: '/nhap-lieu/van-tai',
    MINING: '/nhap-lieu/khai-thac',
    RECONCILIATION: '/nhap-lieu/doi-chieu',
  },
  DANH_MUC: {
    DON_VI: '/danh-muc/don-vi',
    THONG_TIN_XE: '/danh-muc/thong-tin-xe',
    THONG_TIN_MAY: '/danh-muc/thong-tin-may',
    VAT_LIEU: '/danh-muc/vat-lieu',
    DIEM_DO_TAI: '/danh-muc/diem-do-tai',
    NHOM_HANG: '/danh-muc/nhom-hang',
    LOAI_HANG: '/danh-muc/loai-hang',
    CA_LAM_VIEC: '/danh-muc/ca-lam-viec',
    NGUOI_DUNG: '/danh-muc/nguoi-dung',
  },
} as const;
