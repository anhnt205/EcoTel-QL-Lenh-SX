import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleType } from '@/modules/dataentry/types/thong-ke';

interface RoleState {
  currentRole: RoleType;
  setRole: (role: RoleType) => void;
  canAccessPath: (path: string) => boolean;
}

export const ROLE_DETAILS: Record<RoleType, { label: string; description: string; badgeColor: string; defaultPath: string }> = {
  ROLE_TRANSPORT: {
    label: 'Vai trò Vận tải',
    description: 'Nhập liệu & Quản lý chuyến xe đơn vị Vận tải',
    badgeColor: 'bg-emerald-600 text-white',
    defaultPath: '/nhap-lieu/van-tai',
  },
  ROLE_MINING: {
    label: 'Vai trò Khai thác',
    description: 'Ghi nhận & Quản lý xe nhận hàng tại Mỏ/Điểm xúc',
    badgeColor: 'bg-amber-600 text-white',
    defaultPath: '/nhap-lieu/khai-thac',
  },
  ROLE_STATISTICIAN: {
    label: 'Nhân viên Thống kê',
    description: 'Đối chiếu song song & Xuất báo cáo tổng hợp',
    badgeColor: 'bg-indigo-600 text-white',
    defaultPath: '/nhap-lieu/doi-chieu',
  },
};

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      currentRole: 'ROLE_TRANSPORT',
      setRole: (role: RoleType) => set({ currentRole: role }),
      canAccessPath: (path: string) => {
        const { currentRole } = get();
        if (currentRole === 'ROLE_TRANSPORT') {
          return path.startsWith('/nhap-lieu/van-tai');
        }
        if (currentRole === 'ROLE_MINING') {
          return path.startsWith('/nhap-lieu/khai-thac');
        }
        if (currentRole === 'ROLE_STATISTICIAN') {
          return path.startsWith('/nhap-lieu/doi-chieu');
        }
        return false;
      },
    }),
    {
      name: 'user-role-storage',
    }
  )
);
