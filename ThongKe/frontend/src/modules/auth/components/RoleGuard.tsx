import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

/**
 * Tạm thời chỉ kiểm tra authentication, bỏ qua phân quyền.
 * TODO: Bật lại role check khi cần phân quyền.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children }) => {
  const { loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500 font-medium">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // TODO: Bật lại role check khi cần phân quyền
  // const { user } = useAuthStore();
  // const userRole = user?.permissions ? ... : null;
  // if (!allowedRoles.includes(userRole)) { ... }

  return <>{children}</>;
};
