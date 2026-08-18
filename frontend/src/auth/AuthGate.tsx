import { useEffect, useState } from "react";
import { initializeAppAuth } from "./initializeAuth";
import { useAuthStore } from "@/stores/authStore";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, initAuth } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log("[AuthGate] Triggering initializeAppAuth...");

    initializeAppAuth().then((result) => {
      if (!mounted) return;
      console.log("[AuthGate] initializeAppAuth completed:", result);

      if (result.ok) {
        console.log("[AuthGate] Auth successful, calling initAuth...");
        initAuth();
      } else {
        console.error("[AuthGate] Auth failed, setting error:", result.error);
        setAuthError(result.error ?? "Xác thực thất bại");
      }
    });

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Đang kiểm tra auth
  if (loading && !authError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-sm text-mid-gray">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Xác thực thất bại — hiển thị lỗi, giữ nguyên trang
  if (authError || !isAuthenticated()) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Xác thực thất bại</h2>
          <p className="text-sm text-gray-600">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
