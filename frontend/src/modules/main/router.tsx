import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGuard as ModuleRoleGuard } from "@/modules/auth/components/RoleGuard";
import { MainLayout } from "@/layouts/main-layout";

import { statisticsRoutes } from "@/modules/dataentry/router";
import { reconciliationRoutes } from "@/modules/reconciliation/router";
import { reportsRoutes } from "@/modules/report/router";

const TransportEntryPage = lazy(() =>
  import("@/modules/dataentry/pages/TransportEntryPage").then((m) => ({ default: m.TransportEntryPage }))
);
const MiningEntryPage = lazy(() =>
  import("@/modules/dataentry/pages/MiningEntryPage").then((m) => ({ default: m.MiningEntryPage }))
);
const ReconciliationPage = lazy(() =>
  import("@/modules/reconciliation/pages/ReconciliationPage").then((m) => ({ default: m.ReconciliationPage }))
);

const DepartmentsPage = lazy(() => import("@/modules/departments/Departments"));
const DeviceTypesPage = lazy(() => import("@/modules/deviceTypes/DeviceTypes"));
const DeviceModelsPage = lazy(() => import("@/modules/deviceModels/DeviceModels"));
const VehiclesPage = lazy(() => import("@/modules/vehicles/Vehicles"));
const MachinePage = lazy(() => import("@/modules/machine/Machine"));
const TravelLogPage = lazy(() => import("@/modules/TravelLog/TravelLog"));
const ModelPage = lazy(() => import("@/modules/model/Model"));
const MaterialsPage = lazy(() => import("@/modules/materials/Materials"));
const LocationsPage = lazy(() => import("@/modules/locations/Locations"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-xs">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
  </div>
);

export const mainRoutes = (
  <Route element={<ProtectedRoute />}>
    {/* Các module dùng MainLayout */}
    <Route element={<MainLayout />}>
      {/* Module Thống Kê (Đối chiếu Vận tải - Khai thác) */}
      <Route
        path={ROUTES.DATA_ENTRY.TRANSPORT}
        element={
          <ModuleRoleGuard allowedRoles={["ROLE_TRANSPORT"]}>
            <Suspense fallback={<PageLoader />}>
              <TransportEntryPage />
            </Suspense>
          </ModuleRoleGuard>
        }
      />
      <Route
        path={ROUTES.DATA_ENTRY.MINING}
        element={
          <ModuleRoleGuard allowedRoles={["ROLE_MINING"]}>
            <Suspense fallback={<PageLoader />}>
              <MiningEntryPage />
            </Suspense>
          </ModuleRoleGuard>
        }
      />
      <Route
        path={ROUTES.DATA_ENTRY.RECONCILIATION}
        element={
          <ModuleRoleGuard allowedRoles={["ROLE_STATISTICIAN"]}>
            <Suspense fallback={<PageLoader />}>
              <ReconciliationPage />
            </Suspense>
          </ModuleRoleGuard>
        }
      />

      {/* Statistics */}
      {statisticsRoutes}

      {/* Reconciliation */}
      {reconciliationRoutes}

      {/* Reports */}
      {reportsRoutes}

      {/* Danh mục routes */}
      <Route
        path={ROUTES.DANH_MUC.DON_VI}
        element={
          <Suspense fallback={<PageLoader />}>
            <DepartmentsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.PHAN_LOAI_THIET_BI}
        element={
          <Suspense fallback={<PageLoader />}>
            <DeviceTypesPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CHUNG_LOAI_THIET_BI}
        element={
          <Suspense fallback={<PageLoader />}>
            <DeviceModelsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.THONG_TIN_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehiclesPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.THONG_TIN_MAY}
        element={
          <Suspense fallback={<PageLoader />}>
            <MachinePage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CUNG_DO}
        element={
          <Suspense fallback={<PageLoader />}>
            <TravelLogPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.MO_HINH_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <ModelPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.VAT_LIEU}
        element={
          <Suspense fallback={<PageLoader />}>
            <MaterialsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.DIEM_DO_TAI}
        element={
          <Suspense fallback={<PageLoader />}>
            <LocationsPage />
          </Suspense>
        }
      />
    </Route>
  </Route>
);

