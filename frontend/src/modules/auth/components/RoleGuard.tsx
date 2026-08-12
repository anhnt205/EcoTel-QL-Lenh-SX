import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRoleStore, ROLE_DETAILS } from '@/stores/useRoleStore';
import { useAuthStore } from '@/modules/auth/stores/auth.store';
import type { RoleType } from '@/modules/dataentry/types/thong-ke';

interface RoleGuardProps {
  allowedRoles: RoleType[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentRole, setRole } = useRoleStore();
  const { user, isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  const isAuth = isAuthenticated();
  const userRole = user?.role;

  let canAccess = false;
  if (userRole === 'admin' || userRole === 'nhap_lieu') {
    canAccess = true;
  } else if (userRole === 'bao_cao') {
    canAccess = allowedRoles.includes('ROLE_STATISTICIAN');
  } else {
    canAccess = allowedRoles.includes(currentRole);
  }

  useEffect(() => {
    if (!loading && isAuth && canAccess && allowedRoles.length > 0) {
      const primaryRole = allowedRoles[0];
      if (currentRole !== primaryRole) {
        setRole(primaryRole);
      }
    }
  }, [loading, isAuth, canAccess, allowedRoles, currentRole, setRole]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500 font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (!canAccess) {
    if (userRole === 'bao_cao') {
      return <Navigate to="/nhap-lieu/doi-chieu" replace />;
    }

    const redirectPath = ROLE_DETAILS[currentRole]?.defaultPath || '/nhap-lieu/van-tai';
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Truy cập bị từ chối (Access Denied)
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
          Tài khoản của bạn không có quyền truy cập vào màn hình này.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

