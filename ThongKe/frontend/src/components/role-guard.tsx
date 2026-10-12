import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';

interface RoleGuardProps {
  allowedRoles: string[];
}

/**
 * Tạm thời bỏ qua role check, chỉ kiểm tra authentication.
 * TODO: Bật lại role check khi cần phân quyền.
 */
export function RoleGuard({ allowedRoles: _allowedRoles }: RoleGuardProps) {
  const { loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  // TODO: Bật lại role check khi cần phân quyền
  // if (!hasRole(allowedRoles)) {
  //   return <Navigate to={ROUTES.FORBIDDEN} replace />;
  // }

  return <Outlet />;
}
