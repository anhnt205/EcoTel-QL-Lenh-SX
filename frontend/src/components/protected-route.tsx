import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

export function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-sm text-mid-gray">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    // AuthGate đã xử lý redirect, đây là safety net
    if (PORTAL_URL) {
      window.location.href = PORTAL_URL;
      return null;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
