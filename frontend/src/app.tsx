import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import { authRoutes } from "@/modules/auth/router";
import { mainRoutes } from "@/modules/main/router";
import { NotFoundPage } from "@/components/not-found-page";
import { useEffect } from "react";
if (import.meta.env.VITE_MOCK_API === "true") {
  const { setupMockApi } = await import("@/lib/mock-api");
  setupMockApi();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { ROUTES } from "@/constants/routes";
import { Navigate } from "react-router-dom";

function AppRoutes() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <Routes>
      {/* Root redirect to Module Thống Kê */}
      <Route path="/" element={<Navigate to={ROUTES.DATA_ENTRY.TRANSPORT} replace />} />
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
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
