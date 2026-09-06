import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import logo from "@/assets/logo.png";
import {
  ChevronDown,
  User,
  LogOut,
  Truck,
  Pickaxe,
  GitCompareArrows,
  Menu,
  FolderTree,
  Cog,
  Layers,
  Grid3x3,
  Calculator,
  MapPin,
  Building2,
  Clock,
  FileCheck,
  Ruler,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useRoleStore, ROLE_DETAILS } from "@/stores/useRoleStore";
import type { RoleType } from "@/modules/dataentry/types/thong-ke";

export function Header() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const { currentRole, setRole } = useRoleStore();

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-white/15 ${
      isActive
        ? "bg-white/20 text-white font-semibold shadow-xs"
        : "text-white/95 hover:text-white"
    }`;

  const dropdownTriggerClass = (isActive: boolean) =>
    `flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-white/15 outline-none cursor-pointer ${
      isActive
        ? "bg-white/20 text-white font-semibold shadow-xs"
        : "text-white/95 hover:text-white"
    }`;

  return (
    <header
      className="sticky top-0 z-50 flex flex-col w-full select-none shadow-md"
      style={{
        background:
          "linear-gradient(to right, #0b109aff, #0284c7ff, #1e40afff, #0b109aff)",
      }}
    >
      {/* 1. Top Section Header (Company Info & Software Title) */}
      <div className="bg-transparent text-white py-4 px-4 flex items-center justify-center border-b border-white/20">
        {/* Logo + Content side by side, centered as a group */}
        <div className="flex items-center gap-4 max-w-7xl w-full justify-center">
          <img
            src={logo}
            alt="Logo Than Cao Sơn"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain shrink-0"
          />
          {/* Company Info */}
          <div className="text-center">
            <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-wide leading-tight uppercase text-white drop-shadow-sm">
              CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-0.5 mt-1">
              <span className="flex items-center gap-1 text-xs sm:text-[13px] text-blue-100 font-medium">
                Tổ 1, Khu Cao Sơn 2, P. Cửa Ông, Tỉnh Quảng Ninh
              </span>
              <span className="hidden sm:inline text-blue-200 opacity-60">
                |
              </span>
              <span className="flex items-center gap-1 text-xs sm:text-[13px] text-blue-100 font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                    clipRule="evenodd"
                  />
                </svg>
                0203.386.2337
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold tracking-wide text-white uppercase mt-1.5">
              PHẦN MỀM THỐNG KÊ CAO SƠN
            </p>
          </div>
        </div>
      </div>

      {/* 2. Bottom Navigation Menu Bar */}
      <div className="bg-black/10 backdrop-blur-xs text-white px-4 py-1 flex items-center justify-between border-t border-white/10">
        {/* Left Side: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Nhập liệu Khai thác & Nhập liệu Vận tải */}
          {/* TODO: Bật lại role check khi cần phân quyền */}
          <NavLink
            to="/nhap-lieu/khai-thac"
            className={({ isActive }) =>
              navItemClass(
                isActive || pathname.startsWith("/nhap-lieu/khai-thac"),
              )
            }
          >
            <Pickaxe className="h-4 w-4 mr-0.5" />
            Nhập liệu Khai thác
          </NavLink>
          <NavLink
            to="/nhap-lieu/van-tai"
            className={({ isActive }) =>
              navItemClass(
                isActive || pathname.startsWith("/nhap-lieu/van-tai"),
              )
            }
          >
            <Truck className="h-4 w-4 mr-0.5" />
            Nhập liệu Vận tải
          </NavLink>

          {/* Danh mục ∨ */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={dropdownTriggerClass(
                pathname.startsWith("/danh-muc") &&
                  !pathname.startsWith(ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU) &&
                  !pathname.startsWith(ROUTES.DANH_MUC.AP_TRAC_DIA),
              )}
            >
              <FolderTree className="h-4 w-4 mr-0.5" />
              Danh mục
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 p-1 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-lg"
            >
              <DropdownMenuLabel className="text-[11px] font-bold uppercase text-gray-400 px-2 py-1">
                Quản lý danh mục
              </DropdownMenuLabel>

              {/* Thiết bị (Sub Menu) */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer">
                  <Cog className="h-4 w-4 text-blue-600" />
                  <span>Thiết bị</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48 p-1 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-lg ml-1">
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.THONG_TIN_XE}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                    >
                      Thông tin xe
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.THONG_TIN_MAY}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                    >
                      Thông tin máy
                    </NavLink>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Nhóm hàng */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NHOM_HANG}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  Nhóm hàng
                </NavLink>
              </DropdownMenuItem>

              {/* 5 danh mục mới (2026-08-30) */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.KHU_VUC_XUC}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  Khu vực xúc
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NOI_NHAN_TAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  Nơi nhận tải
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NOI_DO_TAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  Nơi dỡ tải
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NOI_CHAT_TAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  Nơi chất tải
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CHUNG_LOAI_HANG}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Chủng loại hàng
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NHOM_CHUNG_LOAI_HANG}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Nhóm chủng loại hàng
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.SAN_PHAM_NGHIEM_THU}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Sản phẩm nghiệm thu
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.TTL_CLH}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  TTL CLH
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NHOM_VIA}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Nhóm vỉa
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CHUNG_LOAI_XE}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Chủng loại xe
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.PHAN_LOAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Phân loại
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CHUNG_LOAI_XE_DMNL}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Chủng loại xe + DMNL
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CHUNG_LOAI_XE_PHAN_LOAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Chủng loại xe + Phân loại
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NHOM_HANG_XE}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Nhóm hạng xe
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.HANG_XE}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Hạng xe
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.HE_SO}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Hệ số
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.KY_BAO_CAO}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Kỳ báo cáo
                </NavLink>
              </DropdownMenuItem>

              {/* Danh mục dạng lưới (bảng tra hai chiều) */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.MO_HINH}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Grid3x3 className="h-4 w-4 text-blue-600" />
                  Mô hình (m3/chuyến)
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NANG_SUAT_XE}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Grid3x3 className="h-4 w-4 text-blue-600" />
                  Năng suất xe (996)
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.HS_DIEU_CHINH_NLDM}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Grid3x3 className="h-4 w-4 text-blue-600" />
                  HS điều chỉnh NLĐM
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.TY_TRONG}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  Tỷ trọng
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.STD_DAT_CN}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  STD (Đất CN)
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.STD_DAT_SX}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  STD (Đất SX/Than SX)
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.TTSL_XE}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Cog className="h-4 w-4 text-blue-600" />
                  Thuộc tính SL — Xe
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.TTSL_MAY}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Cog className="h-4 w-4 text-blue-600" />
                  Thuộc tính SL — Máy xúc
                </NavLink>
              </DropdownMenuItem>

              {/* Loại hàng */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.LOAI_HANG}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Loại hàng
                </NavLink>
              </DropdownMenuItem>

              {/* Vật liệu */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.VAT_LIEU}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  Vật liệu
                </NavLink>
              </DropdownMenuItem>

              {/* Vị trí */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.DIEM_DO_TAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Vị trí
                </NavLink>
              </DropdownMenuItem>

              {/* Đơn vị */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.DON_VI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Đơn vị
                </NavLink>
              </DropdownMenuItem>

              {/* Ca làm việc */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CA_LAM_VIEC}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  Ca làm việc
                </NavLink>
              </DropdownMenuItem>

              {/* Người dùng & Lái xe */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NGUOI_DUNG}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                >
                  <User className="h-4 w-4 text-blue-600" />
                  Người dùng & Lái xe
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Định mức nhiên liệu — tách riêng khỏi Danh mục, đặt ngay cạnh */}
          <NavLink
            to={ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU}
            className={({ isActive }) =>
              navItemClass(
                isActive || pathname.startsWith(ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU),
              )
            }
          >
            <Grid3x3 className="h-4 w-4 mr-0.5" />
            Định mức nhiên liệu
          </NavLink>

          {/* Áp Trắc Địa — tách riêng khỏi Danh mục, đặt ngay cạnh */}
          <NavLink
            to={ROUTES.DANH_MUC.AP_TRAC_DIA}
            className={({ isActive }) =>
              navItemClass(
                isActive || pathname.startsWith(ROUTES.DANH_MUC.AP_TRAC_DIA),
              )
            }
          >
            <Ruler className="h-4 w-4 mr-0.5" />
            Áp Trắc Địa
          </NavLink>

          {/* Đối chiếu */}
          <NavLink
            to="/nhap-lieu/doi-chieu"
            className={({ isActive }) =>
              navItemClass(
                isActive || pathname.startsWith("/nhap-lieu/doi-chieu"),
              )
            }
          >
            <GitCompareArrows className="h-4 w-4 mr-0.5" />
            Đối chiếu
          </NavLink>

          {/* Báo chuyến */}
          <NavLink
            to={ROUTES.RECONCILIATION.TRIP_REPORT}
            className={({ isActive }) =>
              navItemClass(
                isActive ||
                  pathname.startsWith(ROUTES.RECONCILIATION.TRIP_REPORT),
              )
            }
          >
            <FileCheck className="h-4 w-4 mr-0.5 text-blue-200" />
            Báo chuyến
          </NavLink>

          {/* Báo cáo thống kê — đầu ra cuối cùng, để ở cấp cao nhất chứ không
              nằm trong nhóm Danh mục */}
          <NavLink
            to={ROUTES.BAO_CAO.THONG_KE}
            className={({ isActive }) =>
              navItemClass(isActive || pathname.startsWith(ROUTES.BAO_CAO.THONG_KE))
            }
          >
            <Calculator className="h-4 w-4 mr-0.5 text-blue-200" />
            Báo cáo thống kê
          </NavLink>
        </nav>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 p-2 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-lg"
            >
              {/* TODO: Bật lại role check khi cần phân quyền */}
              <DropdownMenuItem asChild>
                <NavLink
                  to="/nhap-lieu/khai-thac"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <Pickaxe className="h-4 w-4 text-amber-600" /> Nhập liệu Khai
                  thác
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to="/nhap-lieu/van-tai"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <Truck className="h-4 w-4 text-emerald-600" /> Nhập liệu Vận
                  tải
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to="/nhap-lieu/doi-chieu"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <GitCompareArrows className="h-4 w-4 text-indigo-600" /> Đối
                  chiếu
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.RECONCILIATION.TRIP_REPORT}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <FileCheck className="h-4 w-4 text-teal-600" /> Báo chuyến
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-t border-zinc-100" />
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-zinc-400 px-2 py-0.5">
                Danh mục
              </DropdownMenuLabel>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-2 text-sm font-medium rounded hover:bg-blue-50 cursor-pointer">
                  <Cog className="h-4 w-4 text-blue-600" /> Thiết bị
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 p-1 bg-white text-zinc-800 shadow-xl border border-zinc-200 rounded-lg ml-1">
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.THONG_TIN_XE}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                    >
                      Thông tin xe
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.THONG_TIN_MAY}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-blue-50 cursor-pointer"
                    >
                      Thông tin máy
                    </NavLink>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NHOM_HANG}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <FolderTree className="h-4 w-4 text-blue-600" /> Nhóm hàng
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.LOAI_HANG}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <Layers className="h-4 w-4 text-blue-600" /> Loại hàng
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.VAT_LIEU}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <Layers className="h-4 w-4 text-blue-600" /> Vật liệu
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.DIEM_DO_TAI}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <MapPin className="h-4 w-4 text-blue-600" /> Điểm đổ tải
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.DON_VI}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <Building2 className="h-4 w-4 text-blue-600" /> Đơn vị
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CA_LAM_VIEC}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <Clock className="h-4 w-4 text-blue-600" /> Ca làm việc
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.NGUOI_DUNG}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <User className="h-4 w-4 text-blue-600" /> Người dùng & Lái xe
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side Actions (User Profile) */}
        <div className="flex items-center gap-2">
          {/* Tạm ẩn thông báo theo yêu cầu */}
          {/* <NotificationCenter
            notifications={notifications}
            onSelectNotification={handleSelectNotification}
            onMarkAllAsRead={markAllAsRead}
          /> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition-all hover:bg-white/15 outline-none cursor-pointer text-white h-auto select-none">
                <User className="h-4.5 w-4.5" />
                <span>{user?.fullName || "System Admin"}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-2 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-xl"
            >
              <DropdownMenuLabel className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">
                  {user?.fullName || "System Admin"}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-gray-500 font-medium">
                    Vai trò:
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ROLE_DETAILS[currentRole]?.badgeColor ||
                      "bg-blue-600 text-white"
                    }`}
                  >
                    {ROLE_DETAILS[currentRole]?.label || currentRole}
                  </span>
                </div>
              </DropdownMenuLabel>

              {/* Role Switcher Menu */}
              <div className="py-1.5 px-1 border-b border-gray-100">
                <p className="text-[10px] font-bold uppercase text-gray-400 px-2 py-1 tracking-wider">
                  Chuyển vai trò test
                </p>
                {(Object.keys(ROLE_DETAILS) as RoleType[]).map((r) => {
                  const isSelected = currentRole === r;
                  return (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/50 dark:text-blue-300"
                          : "hover:bg-gray-100 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span>{ROLE_DETAILS[r].label}</span>
                      {isSelected && (
                        <span className="text-xs text-blue-600 font-bold">
                          ✓
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>

              <DropdownMenuItem
                onClick={() => signOut?.()}
                className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất hệ thống
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
