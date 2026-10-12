import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

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
    // AuthGate đã hiển thị lỗi, giữ nguyên trang
    return null;
  }

  return <Outlet />;
}
