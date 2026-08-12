// [AUTH DISABLED] - Xác thực tạm thời bị tắt, mọi người đều có thể truy cập
export function AuthGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
