export const ROLES = {
  ADMIN: 'admin',
  NHAP_LIEU: 'nhap_lieu',
  BAO_CAO: 'bao_cao',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// Quyền truy cập menu theo role
export const ROLE_MENU_ACCESS: Record<UserRole, string[]> = {
  [ROLES.ADMIN]: [
    '/',
    '/admin/users',
    '/statistics',
    '/reconciliation',
  ],
  [ROLES.NHAP_LIEU]: ['/statistics', '/reconciliation'],
  [ROLES.BAO_CAO]: ['/reconciliation'],
};

// Label tiếng Việt cho role
export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.ADMIN]: 'Quản trị',
  [ROLES.NHAP_LIEU]: 'Nhập liệu',
  [ROLES.BAO_CAO]: 'Báo cáo',
};
