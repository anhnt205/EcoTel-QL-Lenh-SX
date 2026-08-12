import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleGuard as ModuleRoleGuard } from "@/modules/auth/components/RoleGuard";
import { MainLayout } from "@/layouts/main-layout";

import { statisticsRoutes } from "@/modules/dataentry/router";

const TransportEntryPage = lazy(() =>
  import("@/modules/dataentry/pages/TransportEntryPage").then((m) => ({
    default: m.TransportEntryPage,
  }))
);
const MiningEntryPage = lazy(() =>
  import("@/modules/dataentry/pages/MiningEntryPage").then((m) => ({
    default: m.MiningEntryPage,
  }))
);
const ReconciliationPage = lazy(() =>
  import("@/modules/reconciliation/pages/ReconciliationPage").then((m) => ({
    default: m.ReconciliationPage,
  }))
);

const DepartmentsPage = lazy(() => import("@/modules/departments/Departments"));
const VehiclesPage = lazy(() => import("@/modules/vehicles/Vehicles"));
const MachinePage = lazy(() => import("@/modules/machine/Machine"));
const MaterialsPage = lazy(() => import("@/modules/materials/Materials"));
const LocationsPage = lazy(() => import("@/modules/locations/Locations"));
const CargoGroupsPage = lazy(() => import("@/modules/cargoGroups/CargoGroups"));
const CargoTypesPage = lazy(() => import("@/modules/cargoTypes/CargoTypes"));
const ShiftsPage = lazy(() => import("@/modules/shifts/Shifts"));
const UsersPage = lazy(() => import("@/modules/users/Users"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-xs">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
  </div>
);

export const mainRoutes = (
  <Route element={<ProtectedRoute />}>
    <Route element={<MainLayout />}>
      {/* Module Thống Kê (Vận tải - Khai thác - Đối chiếu) */}
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

      {/* 8 Danh mục chuẩn hóa theo Backend */}
      <Route
        path={ROUTES.DANH_MUC.DON_VI}
        element={
          <Suspense fallback={<PageLoader />}>
            <DepartmentsPage />
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
      <Route
        path={ROUTES.DANH_MUC.NHOM_HANG}
        element={
          <Suspense fallback={<PageLoader />}>
            <CargoGroupsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.LOAI_HANG}
        element={
          <Suspense fallback={<PageLoader />}>
            <CargoTypesPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CA_LAM_VIEC}
        element={
          <Suspense fallback={<PageLoader />}>
            <ShiftsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NGUOI_DUNG}
        element={
          <Suspense fallback={<PageLoader />}>
            <UsersPage />
          </Suspense>
        }
      />
    </Route>
  </Route>
);
