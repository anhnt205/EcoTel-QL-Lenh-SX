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
const StandardTripReportPage = lazy(() =>
  import("@/modules/reconciliation/pages/StandardTripReportPage").then((m) => ({
    default: m.StandardTripReportPage,
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

// 5 danh mục dùng chung CatalogPage (cấu hình trong modules/catalog/configs.ts)
const ExcavationAreasPage = lazy(() => import("@/modules/catalog/pages/ExcavationAreas"));
const ReceivingPointsPage = lazy(() => import("@/modules/catalog/pages/ReceivingPoints"));
const UnloadingPointsPage = lazy(() => import("@/modules/catalog/pages/UnloadingPoints"));
const PickupPointsPage = lazy(() => import("@/modules/catalog/pages/PickupPoints"));
const CargoTypesCatalogPage = lazy(() => import("@/modules/catalog/pages/CargoTypesCatalog"));
const CargoGroupsCatalogPage = lazy(() => import("@/modules/catalog/pages/CargoGroupsCatalog"));
const AcceptanceProductsPage = lazy(() => import("@/modules/catalog/pages/AcceptanceProducts"));
const TtlClhItemsPage = lazy(() => import("@/modules/catalog/pages/TtlClhItems"));
const SeamGroupsPage = lazy(() => import("@/modules/catalog/pages/SeamGroups"));
const VehicleTypesPage = lazy(() => import("@/modules/catalog/pages/VehicleTypes"));
const VehicleRankGroupsPage = lazy(() => import("@/modules/catalog/pages/VehicleRankGroups"));
const VehicleRanksPage = lazy(() => import("@/modules/catalog/pages/VehicleRanks"));
const VehicleFuelClassesPage = lazy(() => import("@/modules/catalog/pages/VehicleFuelClasses"));
const VehicleCategoryClassesPage = lazy(() => import("@/modules/catalog/pages/VehicleCategoryClasses"));
const CoefficientsPage = lazy(() => import("@/modules/catalog/pages/Coefficients"));
const ReportPeriodsPage = lazy(() => import("@/modules/catalog/pages/ReportPeriods"));
const ModelMatrixPage = lazy(() => import("@/modules/catalog/pages/ModelMatrix"));
const FuelNormMatrixPage = lazy(() => import("@/modules/catalog/pages/FuelNormMatrix"));
const VehicleOutputMatrixPage = lazy(() => import("@/modules/catalog/pages/VehicleOutputMatrix"));
const FuelAdjustMatrixPage = lazy(() => import("@/modules/catalog/pages/FuelAdjustMatrix"));
const DensityParametersPage = lazy(() => import("@/modules/catalog/pages/DensityParameters"));
const SurveyStandardDatCnPage = lazy(() => import("@/modules/catalog/pages/SurveyStandardDatCn"));
const SurveyStandardDatSxPage = lazy(() => import("@/modules/catalog/pages/SurveyStandardDatSx"));
const AreaApplicationReportPage = lazy(() => import("@/modules/production/AreaApplicationReportPage"));
const VehicleProductionAttrsPage = lazy(() => import("@/modules/catalog/pages/VehicleProductionAttrs"));
const MachineProductionAttrsPage = lazy(() => import("@/modules/catalog/pages/MachineProductionAttrs"));

const ProductionReportPage = lazy(() => import("@/modules/production/ProductionReportPage"));

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
      <Route
        path={ROUTES.RECONCILIATION.TRIP_REPORT}
        element={
          <ModuleRoleGuard allowedRoles={["ROLE_STATISTICIAN"]}>
            <Suspense fallback={<PageLoader />}>
              <StandardTripReportPage />
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
      <Route
        path={ROUTES.DANH_MUC.KHU_VUC_XUC}
        element={
          <Suspense fallback={<PageLoader />}>
            <ExcavationAreasPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NOI_NHAN_TAI}
        element={
          <Suspense fallback={<PageLoader />}>
            <ReceivingPointsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NOI_DO_TAI}
        element={
          <Suspense fallback={<PageLoader />}>
            <UnloadingPointsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NOI_CHAT_TAI}
        element={
          <Suspense fallback={<PageLoader />}>
            <PickupPointsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CHUNG_LOAI_HANG}
        element={
          <Suspense fallback={<PageLoader />}>
            <CargoTypesCatalogPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NHOM_CHUNG_LOAI_HANG}
        element={
          <Suspense fallback={<PageLoader />}>
            <CargoGroupsCatalogPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.SAN_PHAM_NGHIEM_THU}
        element={
          <Suspense fallback={<PageLoader />}>
            <AcceptanceProductsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.TTL_CLH}
        element={
          <Suspense fallback={<PageLoader />}>
            <TtlClhItemsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NHOM_VIA}
        element={
          <Suspense fallback={<PageLoader />}>
            <SeamGroupsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CHUNG_LOAI_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleTypesPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CHUNG_LOAI_XE_DMNL}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleFuelClassesPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.CHUNG_LOAI_XE_PHAN_LOAI}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleCategoryClassesPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NHOM_HANG_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleRankGroupsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.HANG_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleRanksPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.HE_SO}
        element={
          <Suspense fallback={<PageLoader />}>
            <CoefficientsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.KY_BAO_CAO}
        element={
          <Suspense fallback={<PageLoader />}>
            <ReportPeriodsPage />
          </Suspense>
        }
      />

      {/* 4 danh mục dạng LƯỚI (bảng tra hai chiều) */}
      <Route
        path={ROUTES.DANH_MUC.MO_HINH}
        element={
          <Suspense fallback={<PageLoader />}>
            <ModelMatrixPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU}
        element={
          <Suspense fallback={<PageLoader />}>
            <FuelNormMatrixPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.NANG_SUAT_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleOutputMatrixPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.HS_DIEU_CHINH_NLDM}
        element={
          <Suspense fallback={<PageLoader />}>
            <FuelAdjustMatrixPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.TY_TRONG}
        element={
          <Suspense fallback={<PageLoader />}>
            <DensityParametersPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.STD_DAT_CN}
        element={
          <Suspense fallback={<PageLoader />}>
            <SurveyStandardDatCnPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.STD_DAT_SX}
        element={
          <Suspense fallback={<PageLoader />}>
            <SurveyStandardDatSxPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.AP_TRAC_DIA}
        element={
          <Suspense fallback={<PageLoader />}>
            <AreaApplicationReportPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.TTSL_XE}
        element={
          <Suspense fallback={<PageLoader />}>
            <VehicleProductionAttrsPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.DANH_MUC.TTSL_MAY}
        element={
          <Suspense fallback={<PageLoader />}>
            <MachineProductionAttrsPage />
          </Suspense>
        }
      />

      {/* Đầu ra cuối cùng — tương ứng sheet `tinh toan` của bảng tính gốc */}
      <Route
        path={ROUTES.BAO_CAO.THONG_KE}
        element={
          <Suspense fallback={<PageLoader />}>
            <ProductionReportPage />
          </Suspense>
        }
      />
    </Route>
  </Route>
);
