import { Suspense } from "react";
import { Route, Outlet } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { TransportEntryPage } from "@/modules/dataentry/pages/TransportEntryPage";

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-xs">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
  </div>
);

export const statisticsRoutes = (
  <Route
    element={
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    }
  >
    <Route
      path={ROUTES.STATISTICS.INTERNAL_TRUCKS}
      element={<TransportEntryPage />}
    />
    <Route
      path={ROUTES.STATISTICS.EXTERNAL_TRUCKS}
      element={<TransportEntryPage />}
    />
  </Route>
);

