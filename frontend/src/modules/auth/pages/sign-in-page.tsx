import { useEffect } from "react";

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

/**
 * Trang đăng nhập redirect về Portal.
 * Đăng nhập được xử lý bởi Portal SSO, không phải app này.
 */
export function SignInPage() {
  useEffect(() => {
    if (PORTAL_URL) {
      window.location.href = PORTAL_URL;
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Đang chuyển đến trang đăng nhập...</p>
      </div>
    </div>
  );
}
