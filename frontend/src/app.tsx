import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { authRoutes } from "@/modules/auth/router";
import { mainRoutes } from "@/modules/main/router";
import { NotFoundPage } from "@/components/not-found-page";
import { ROUTES } from "@/constants/routes";
import { AuthGate } from "@/auth/AuthGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to Module Thống Kê */}
      <Route
        path="/"
        element={<Navigate to={ROUTES.DATA_ENTRY.TRANSPORT} replace />}
      />
      <Route
        path="/nhap-lieu"
        element={<Navigate to={ROUTES.DATA_ENTRY.TRANSPORT} replace />}
      />
      <Route
        path="/thong-ke"
        element={<Navigate to={ROUTES.DATA_ENTRY.TRANSPORT} replace />}
      />

      {authRoutes}
      {mainRoutes}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthGate>
    </QueryClientProvider>
  );
}
