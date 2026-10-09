import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress } from "@mui/material";
import socketService from "./services/socketService";
import api from "./config/api.config";
import { userAtom } from "./atoms/userAtoms";
import { useAtom } from "jotai";
import { RoleEnum } from "./enums";
import MainLayout from "./layout/MainLayout";
import RequireModule from "./permissions/RequireModule";
import "./index.css";

// Tải lười (lazy loading) các trang để tối ưu dung lượng tải lần đầu (Code Splitting)
const Login = lazy(() => import("./pages/auth/Login"));
const Orders = lazy(() => import("./pages/orders/Orders"));
const Devices = lazy(() => import("./pages/vehicles/Vehicles"));
const Departments = lazy(() => import("./pages/departments/Departments"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));
const Users = lazy(() => import("./pages/users/Users"));
const Materials = lazy(() => import("./pages/materials/Materials"));
const Locations = lazy(() => import("./pages/locations/Locations"));
const Jobs = lazy(() => import("./pages/job/Job"));
const Positions = lazy(() => import("./pages/positions/Positions"));
const DeviceTypes = lazy(() => import("./pages/deviceTypes/DeviceTypes"));
const DispatcherOrders = lazy(() => import("./pages/dispatcherOrder/DispatcherOrders"));
const SafetyMeasures = lazy(() => import("./pages/safetyMeasures/SafetyMeasures"));
const Machines = lazy(() => import("./pages/machine/Machine"));
const Shifts = lazy(() => import("./pages/shift/Shifts"));
const OrderByUsers = lazy(() => import("./pages/orders/OrderByUser"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy/PrivacyPolicy"));
const TravelLogs = lazy(() => import("./pages/TravelLog/TravelLog"));
const DashBoard = lazy(() => import("./pages/dashboard/Dashboard"));
const DeviceModels = lazy(() => import("./pages/deviceModels/DeviceModels"));
const Models = lazy(() => import("./pages/model/Model"));
const SystemDashboard = lazy(() => import("./pages/dashboard/System"));
const EmbeddedThongKe = lazy(() => import("./pages/thongke/EmbeddedThongKe"));
const OutputStats = lazy(() => import("./pages/thongke/OutputStats"));

const PageLoader: React.FC = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "50vh",
      width: "100%",
    }}
  >
    <CircularProgress size={36} />
  </Box>
);

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" />;
  }
  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </MainLayout>
  );
};

const App = () => {
  const token = localStorage.getItem("token");
  const [user, setUser] = useAtom(userAtom);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["user", token],
    queryFn: () => api.get(`/auth/me`).then((res) => res.data.data.user),
    enabled: !!token,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  useEffect(() => {
    // Lắng nghe notification từ socket
    socketService.onNotification((data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderByUser"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
    });

    // Cleanup khi component unmount
    return () => {
      socketService.offNotification();
    };
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/privacy_policy" element={<PrivacyPolicy />} />
          <Route
            path="/"
            element={
              <PrivateRoute><RequireModule module="dashboard">
                <DashBoard />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute><RequireModule module="orders">
                {user?.role === RoleEnum.DISPATCHER ? (
                  <DispatcherOrders />
                ) : (
                  <Orders />
                )}
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/orderByUsers"
            element={
              <PrivateRoute><RequireModule module="my-tasks">
                <OrderByUsers />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/safetyMeasures"
            element={
              <PrivateRoute><RequireModule module="safety-measures">
                <SafetyMeasures />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/deviceTypes"
            element={
              <PrivateRoute><RequireModule module="device-vehicles">
                <DeviceTypes />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <PrivateRoute><RequireModule module="device-vehicles">
                <Devices />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/shifts"
            element={
              <PrivateRoute><RequireModule module="tk-shifts">
                <Shifts />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/machines"
            element={
              <PrivateRoute><RequireModule module="device-machines">
                <Machines />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/models"
            element={
              <PrivateRoute><RequireModule module="models">
                <Models />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <PrivateRoute><RequireModule module="materials">
                <Materials />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <PrivateRoute><RequireModule module="jobs">
                <Jobs />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/positions"
            element={
              <PrivateRoute><RequireModule module="positions">
                <Positions />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <PrivateRoute><RequireModule module="locations">
                <Locations />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <PrivateRoute><RequireModule module="departments">
                <Departments />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute><RequireModule module="reports">
                <Reports />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute><RequireModule module="users">
                <Users />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/travelLog"
            element={
              <PrivateRoute><RequireModule module="travel-logs">
                <TravelLogs />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/deviceModels"
            element={
              <PrivateRoute><RequireModule module="device-vehicles">
                <DeviceModels />
              </RequireModule></PrivateRoute>
            }
          />
          <Route
            path="/system"
            element={
              <PrivateRoute><RequireModule module="system">
                <SystemDashboard />
              </RequireModule></PrivateRoute>
            }
          />
          {/* Phần mềm Thống kê nhúng cùng domain (xem pages/thongke/EmbeddedThongKe).
              Route luôn có mặt nhưng chỉ được dẫn tới khi bật REACT_APP_TK_EMBED. */}
          {/* Thống kê sản lượng: 2 tab (Sản lượng thống kê | Báo chuyến) nhúng từ Thống kê */}
          <Route
            path="/thong-ke-san-luong"
            element={
              <PrivateRoute>
                <RequireModule module="tk">
                  <OutputStats />
                </RequireModule>
              </PrivateRoute>
            }
          />
          <Route
            path="/tk/*"
            element={
              <PrivateRoute><RequireModule module="tk">
                <EmbeddedThongKe />
              </RequireModule></PrivateRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
