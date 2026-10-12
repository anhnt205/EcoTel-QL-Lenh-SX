import React, { useState } from "react";
import { tokenService } from "@/auth/tokenService";

const VITE_API_KONG_URL = import.meta.env.VITE_API_KONG_URL;

/**
 * Màn đăng nhập của chế độ CHẠY ĐỘC LẬP (không qua Portal).
 *
 * Gọi thẳng `POST /api/auth/login` của backend, nhận cặp token rồi lưu vào
 * cùng chỗ mà luồng Portal vẫn dùng (`tokenService`) — nên toàn bộ phần còn
 * lại của ứng dụng không cần biết token đến từ đâu.
 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${VITE_API_KONG_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        // Backend trả 401 kèm thông điệp chung cho cả 2 trường hợp sai
        // username và sai mật khẩu — không để lộ username nào có thật.
        setError(
          res.status === 401
            ? "Sai tên đăng nhập hoặc mật khẩu."
            : `Đăng nhập thất bại (HTTP ${res.status}).`,
        );
        return;
      }

      const { appToken, refreshToken } = await res.json();
      if (!appToken) {
        setError("Máy chủ không trả về token.");
        return;
      }
      tokenService.saveTokens(appToken, refreshToken);
      onSuccess();
    } catch {
      setError("Không kết nối được tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-gray-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm"
      >
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Phần mềm Thống kê Cao Sơn
        </h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Đăng nhập để tiếp tục
        </p>

        <label className="mt-5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
          Tên đăng nhập
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          className="mt-1 h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:border-blue-500"
        />

        <label className="mt-4 block text-xs font-semibold text-gray-700 dark:text-gray-300">
          Mật khẩu
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mt-1 h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:border-blue-500"
        />

        {error && (
          <p className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !username.trim() || !password}
          className="mt-5 h-9 w-full rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
