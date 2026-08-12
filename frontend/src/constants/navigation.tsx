import { ROUTES } from '@/constants/routes';
import {
  FileText,
  GitCompareArrows,
  LayoutDashboard,
} from 'lucide-react';

export interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  section: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: <LayoutDashboard className="h-4 w-4" />,
    section: 'TỔNG QUAN',
  },
  {
    label: 'Xe trong mỏ',
    path: ROUTES.STATISTICS.INTERNAL_TRUCKS,
    icon: <FileText className="h-4 w-4" />,
    section: 'NHẬP LIỆU',
  },
  {
    label: 'Xe thuê ngoài',
    path: ROUTES.STATISTICS.EXTERNAL_TRUCKS,
    icon: <FileText className="h-4 w-4" />,
    section: 'NHẬP LIỆU',
  },
  {
    label: 'Sản lượng',
    path: ROUTES.RECONCILIATION.PRODUCTION,
    icon: <GitCompareArrows className="h-4 w-4" />,
    section: 'ĐỐI CHIẾU',
  },
  {
    label: 'Nhiên liệu',
    path: ROUTES.RECONCILIATION.FUEL,
    icon: <GitCompareArrows className="h-4 w-4" />,
    section: 'ĐỐI CHIẾU',
  },
  {
    label: 'Tổng hợp',
    path: ROUTES.RECONCILIATION.DASHBOARD,
    icon: <GitCompareArrows className="h-4 w-4" />,
    section: 'ĐỐI CHIẾU',
  },
];
