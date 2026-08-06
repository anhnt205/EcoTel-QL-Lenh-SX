import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import {
  Eye,
  BarChart3,
  ChevronDown,
  User,
  LogOut,
  Truck,
  Pickaxe,
  GitCompareArrows,
  Menu,
  FolderTree,
  Cog,
  Route,
  Cpu,
  Layers,
  MapPin,
  Building2,
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
import { ROLE_LABELS } from "@/constants/roles";
export function Header() {
  const { user, signOut } = useAuthStore();
  const { pathname } = useLocation();

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
    <header className="sticky top-0 z-40 flex flex-col w-full select-none shadow-md font-sans">
      {/* 1. Top Section Header (Green background, Company Info & Software Title) */}
      <div className="bg-[#137947] text-white py-4 px-4 flex items-center justify-center border-b border-emerald-600/40">
        {/* Logo + Content side by side, centered as a group */}
        <div className="flex items-center gap-4 max-w-7xl w-full justify-center">
          <img
            src="/logo.png"
            alt="Logo Than Cao Sơn"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain shrink-0"
          />
          {/* Company Info */}
          <div className="text-center">
            <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-wide leading-tight uppercase text-white drop-shadow-sm">
              CÔNG TY CỔ PHẦN THAN CAO SƠN - TKV
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-0.5 mt-1">
              <span className="flex items-center gap-1 text-xs sm:text-[13px] text-emerald-100 font-medium">
                Tổ 1, Khu Cao Sơn 2, P. Cửa Ông, Tỉnh Quảng Ninh
              </span>
              <span className="hidden sm:inline text-emerald-300 opacity-60">
                |
              </span>
              <span className="flex items-center gap-1 text-xs sm:text-[13px] text-emerald-100 font-medium">
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
      <div className="bg-[#137947] text-white px-4 py-1 flex items-center justify-between border-t border-emerald-600/30">
        {/* Left Side: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Nhập liệu Khai thác & Nhập liệu Vận tải (Admin & Nhập liệu) */}
          {(user?.role === "admin" || user?.role === "nhap_lieu") && (
            <>
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
            </>
          )}

          {/* Danh mục ∨ */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={dropdownTriggerClass(pathname.startsWith("/danh-muc"))}
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
                <DropdownMenuSubTrigger className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer">
                  <Cog className="h-4 w-4 text-emerald-600" />
                  <span>Thiết bị</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48 p-1 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-lg ml-1">
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.PHAN_LOAI_THIET_BI}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                    >
                      Phân loại thiết bị
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.CHUNG_LOAI_THIET_BI}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                    >
                      Chủng loại thiết bị
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.THONG_TIN_XE}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                    >
                      Thông tin xe
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to={ROUTES.DANH_MUC.THONG_TIN_MAY}
                      className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                    >
                      Thông tin máy
                    </NavLink>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Cung độ */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.CUNG_DO}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <Route className="h-4 w-4 text-emerald-600" />
                  Cung độ
                </NavLink>
              </DropdownMenuItem>

              {/* Mô hình xe */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.MO_HINH_XE}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <Cpu className="h-4 w-4 text-emerald-600" />
                  Mô hình xe
                </NavLink>
              </DropdownMenuItem>

              {/* Vật liệu */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.VAT_LIEU}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Vật liệu
                </NavLink>
              </DropdownMenuItem>

              {/* Điểm đổ tải */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.DIEM_DO_TAI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Điểm đổ tải
                </NavLink>
              </DropdownMenuItem>

              {/* Đơn vị */}
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.DANH_MUC.DON_VI}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Đơn vị
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Xem báo cáo ∨ */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={dropdownTriggerClass(pathname.startsWith("/reports"))}
            >
              <Eye className="h-4 w-4 mr-0.5" />
              Báo cáo
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 p-1 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-lg"
            >
              <DropdownMenuLabel className="text-[11px] font-bold uppercase text-gray-400 px-2 py-1">
                Danh sách báo cáo
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.REPORTS.INTERNAL_TRUCKS}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Báo cáo Xe trong mỏ
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.REPORTS.EXTERNAL_TRUCKS}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Báo cáo Xe thuê ngoài
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.REPORTS.PRODUCTION_ANALYSIS}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Phân tích sản lượng
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink
                  to={ROUTES.REPORTS.SUMMARY}
                  className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Báo cáo tổng hợp
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
              {(user?.role === "admin" || user?.role === "nhap_lieu") && (
                <>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to="/nhap-lieu/khai-thac"
                      className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                    >
                      <Pickaxe className="h-4 w-4 text-amber-600" /> Nhập liệu
                      Khai thác
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink
                      to="/nhap-lieu/van-tai"
                      className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                    >
                      <Truck className="h-4 w-4 text-emerald-600" /> Nhập liệu
                      Vận tải
                    </NavLink>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem asChild>
                <NavLink
                  to="/nhap-lieu/doi-chieu"
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium"
                >
                  <GitCompareArrows className="h-4 w-4 text-indigo-600" /> Đối
                  chiếu
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-t border-zinc-100" />
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-zinc-400 px-2 py-0.5">
                Danh mục
              </DropdownMenuLabel>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-2 text-sm font-medium rounded hover:bg-emerald-50 cursor-pointer">
                  <Cog className="h-4 w-4 text-emerald-600" /> Thiết bị
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 p-1 bg-white text-zinc-800 shadow-xl border border-zinc-200 rounded-lg ml-1">
                  <DropdownMenuItem asChild>
                    <NavLink to={ROUTES.DANH_MUC.PHAN_LOAI_THIET_BI} className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer">
                      Phân loại thiết bị
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to={ROUTES.DANH_MUC.CHUNG_LOAI_THIET_BI} className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer">
                      Chủng loại thiết bị
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to={ROUTES.DANH_MUC.THONG_TIN_XE} className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer">
                      Thông tin xe
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to={ROUTES.DANH_MUC.THONG_TIN_MAY} className="flex items-center gap-2 px-2.5 py-2 text-sm rounded hover:bg-emerald-50 cursor-pointer">
                      Thông tin máy
                    </NavLink>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem asChild>
                <NavLink to={ROUTES.DANH_MUC.CUNG_DO} className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
                  <Route className="h-4 w-4 text-emerald-600" /> Cung độ
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink to={ROUTES.DANH_MUC.MO_HINH_XE} className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
                  <Cpu className="h-4 w-4 text-emerald-600" /> Mô hình xe
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink to={ROUTES.DANH_MUC.VAT_LIEU} className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
                  <Layers className="h-4 w-4 text-emerald-600" /> Vật liệu
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink to={ROUTES.DANH_MUC.DIEM_DO_TAI} className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-emerald-600" /> Điểm đổ tải
                </NavLink>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <NavLink to={ROUTES.DANH_MUC.DON_VI} className="flex items-center gap-2 px-2 py-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-emerald-600" /> Đơn vị
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side: System Admin User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-white/15 outline-none cursor-pointer text-white h-auto py-1.5"
            >
              <User className="h-4.5 w-4.5" />
              <span className="font-semibold">
                {user?.hoTen || "System Admin"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 p-2 bg-white text-gray-800 shadow-xl border border-gray-200 rounded-xl"
          >
            <DropdownMenuLabel className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">
                {user?.hoTen || "System Admin"}
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                {user ? ROLE_LABELS[user.role] : "Quản trị hệ thống"}
              </p>
            </DropdownMenuLabel>

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
    </header>
  );
}
