export const API = {
  AUTH: {
    SIGN_IN: '/v1/auth/login',
    REFRESH: '/v1/auth/refresh-token',
    ME: '/v1/auth/me',
    CHANGE_PASSWORD: '/v1/auth/change-password',
  },
  STATISTICS: {
    LIST: '/v1/statistics/list',
    INIT_DATA: '/v1/statistics/init-data',
    BATCH_SAVE: '/v1/statistics/batch-save',
    BATCH_UPDATE: (id: string) => `/v1/statistics/batch-update/${id}`,
    BATCH_DELETE: '/v1/statistics/batch-delete',
    EXPORT: '/v1/statistics/export',
    IMPORT: '/v1/statistics/import',
    SHIFT_FUEL: '/v1/statistics/shift-fuel',
  },
  SHIFTS: {
    LIST: '/v1/shifts',
  },
  RECONCILIATION: {
    PRODUCTION: {
      LIST: '/v1/reconciliation/production',
      EXPORT: '/v1/reconciliation/export/production',
    },
    FUEL: {
      LIST: '/v1/reconciliation/fuel',
      EXPORT: '/v1/reconciliation/export/fuel',
    },
    DASHBOARD: '/v1/reconciliation/dashboard',
    CHARTS: {
      PRODUCTION: '/v1/reconciliation/charts/production',
      FUEL: '/v1/reconciliation/charts/fuel',
    },
    ALERTS: '/v1/reconciliation/alerts',
  },
} as const;
