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
    PRODUCTION: '/reconciliation/production',
    FUEL: '/reconciliation/fuel',
    DASHBOARD: '/reconciliation/dashboard',
  },
  REPORTS: {
    INTERNAL_TRUCKS: '/reports/internal-trucks',
    EXTERNAL_TRUCKS: '/reports/external-trucks',
    PRODUCTION_ANALYSIS: '/reports/production-analysis',
    SUMMARY: '/reports/summary',
  },
  DATA_ENTRY: {
    TRANSPORT: '/nhap-lieu/van-tai',
    MINING: '/nhap-lieu/khai-thac',
    RECONCILIATION: '/nhap-lieu/doi-chieu',
  },
  DANH_MUC: {
    DON_VI: '/danh-muc/don-vi',
    PHAN_LOAI_THIET_BI: '/danh-muc/phan-loai-thiet-bi',
    CHUNG_LOAI_THIET_BI: '/danh-muc/chung-loai-thiet-bi',
    THONG_TIN_XE: '/danh-muc/thong-tin-xe',
    THONG_TIN_MAY: '/danh-muc/thong-tin-may',
    CUNG_DO: '/danh-muc/cung-do',
    MO_HINH_XE: '/danh-muc/mo-hinh-xe',
    VAT_LIEU: '/danh-muc/vat-lieu',
    DIEM_DO_TAI: '/danh-muc/diem-do-tai',
  },
} as const;
