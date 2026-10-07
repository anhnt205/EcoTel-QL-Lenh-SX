import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Login from "./pages/auth/Login";
import Orders from "./pages/orders/Orders";
import Devices from "./pages/vehicles/Vehicles";
import Departments from "./pages/departments/Departments";
import Reports from "./pages/reports/Reports";
import Notifications from "./pages/notifications/Notifications";
import Users from "./pages/users/Users";
import Materials from "./pages/materials/Materials";
import Locations from "./pages/locations/Locations";
import Jobs from "./pages/job/Job";
import Positions from "./pages/positions/Positions";
import socketService from "./services/socketService";
import api from "./config/api.config";
import { userAtom } from "./atoms/userAtoms";
import { useAtom } from "jotai";
import DeviceTypes from "./pages/deviceTypes/DeviceTypes";
import DispatcherOrders from "./pages/dispatcherOrder/DispatcherOrders";
import SafetyMeasures from "./pages/safetyMeasures/SafetyMeasures";
import Machines from "./pages/machine/Machine";
import Shifts from "./pages/shift/Shifts";
import OrderByUsers from "./pages/orders/OrderByUser";
import "./index.css";
import PrivacyPolicy from "./pages/PrivacyPolicy/PrivacyPolicy";
import TravelLogs from "./pages/TravelLog/TravelLog";
import MainLayout from "./layout/MainLayout";
import DashBoard from "./pages/dashboard/Dashboard";
import DeviceModels from "./pages/deviceModels/DeviceModels";
import Models from "./pages/model/Model";
import { RoleEnum } from "./enums";
import SystemDashboard from "./pages/dashboard/System";
import EmbeddedThongKe from "./pages/thongke/EmbeddedThongKe";
import RequireModule from "./permissions/RequireModule";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <MainLayout>{children}</MainLayout>;
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
        <Route
          path="/tk/*"
          element={
            <PrivateRoute><RequireModule module="tk">
              <EmbeddedThongKe />
            </RequireModule></PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
