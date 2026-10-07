import { useState } from "react";
import api from "../config/api.config";
import { useAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
import {
  IconButton,
  Typography,
  Box,
  Avatar,
  Badge,
  Tooltip,
  ButtonBase,
  Menu,
  MenuItem,
  Button,
  Popover,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemText,
  ListItem,
  MenuList,
  ListItemIcon,
} from "@mui/material";
import {
  Work,
  People,
  MenuOpen,
  ExpandMore,
  VpnKeyOutlined,
  Person,
  Notifications,
  Logout,
  KeyboardArrowRight,
  Security,
  Construction,
  Route,
  DirectionsCar,
  Terrain,
  LocationOn,
  Business,
  AccessTime,
  Badge as BadgeIcon,
  Category,
  WorkOutline,
  Dashboard,
} from "@mui/icons-material";
import { ChartNoAxesCombined, ClipboardPaste, MonitorCog } from "lucide-react";
import { userAtom } from "../atoms/userAtoms";
import { useLocation, useNavigate } from "react-router-dom";
import ChangePassword from "../components/Modal/ChangePassword";
import Profile from "../components/Modal/Profile";
import { RoleEnum } from "../enums";
import { ThemeProvider, alpha } from "@mui/material/styles";
import { appFontTheme, uiSansTheme, UI_FONT } from "../theme/uiTheme";
import { brandAccent, brandHeaderBg, brandNavy, brandOnColor, useBranding } from "../branding/BrandingProvider";
import { TK_EMBED } from "../config/features";
import { CATALOG_PATHS_MOVED_TO_TK } from "./thongkeMenu";
import ThongKeNav from "./ThongKeNav";

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useAtom(userAtom);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [avatarAnchorEl, setAvatarAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const theme = useTheme();
  // Logo, tên phần mềm, tên công ty và màu chủ đạo lấy từ Hệ thống > Cấu hình giao diện
  const branding = useBranding();
  const HDR_BLUE = brandAccent(theme.palette.primary.main);
  const HDR_BG = brandHeaderBg(theme.palette.primary.main); // nền thanh trên: đúng màu chủ đạo đã chọn
  const HDR_FG = brandOnColor(HDR_BG); // chữ + biểu tượng trên thanh trên (trắng, hoặc tối nếu nền quá sáng)
  const HDR_NAVY = brandNavy(theme.palette.primary.main); // sắc đậm cho biểu tượng ảnh đại diện
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);

  const [submenuAnchorEl, setSubmenuAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [submenuItems, setSubmenuItems] = useState<any[]>([]);

  const location = useLocation();

  const { data: notificationCount = 0 } = useQuery({
    queryKey: ["notificationCount"],
    queryFn: () =>
      api.get("/notifications/unread/count").then((res) => res.data.data),
  });

  const { data: url } = useQuery({
    queryKey: ["url", user?.avatar],
    queryFn: () =>
      api.get(`/uploads/get?key=${user?.avatar}`).then((res) => res.data.data),
    enabled: !!user?.avatar,
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };
  const menuItems = [
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Biện pháp an toàn",
      icon: <Security fontSize="small" />,
      path: "/safetyMeasures",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER].includes(
      user?.role,
    ) && {
      text: "Thiết bị",
      icon: <Construction fontSize="small" />,
      path: "#",
      submenu: [
        { text: "Phân loại thiết bị", path: "/deviceTypes" },
        { text: "Chủng loại thiết bị", path: "/deviceModels" },
        { text: "Thông tin xe", path: "/vehicles" },
        { text: "Thông tin máy", path: "/machines" },
      ],
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Cung độ",
      icon: <Route fontSize="small" />,
      path: "/travelLog",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER].includes(
      user?.role,
    ) && {
      text: "Mô hình xe",
      icon: <DirectionsCar fontSize="small" />,
      path: "/models",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Vật liệu",
      icon: <Terrain fontSize="small" />,
      path: "/materials",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Điểm đổ tải",
      icon: <LocationOn fontSize="small" />,
      path: "/locations",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER].includes(
      user?.role,
    ) && {
      text: "Cán bộ nhân viên",
      icon: <People fontSize="small" />,
      path: "/users",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Công việc",
      icon: <Work fontSize="small" />,
      path: "/jobs",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Chức danh nghề nghiệp",
      icon: <BadgeIcon fontSize="small" />,
      path: "/positions",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER].includes(
      user?.role,
    ) && {
      text: "Đơn vị",
      icon: <Business fontSize="small" />,
      path: "/departments",
    },
    [RoleEnum.ADMIN, RoleEnum.MANAGER].includes(user?.role) && {
      text: "Ca làm việc",
      icon: <AccessTime fontSize="small" />,
      path: "/shifts",
    },
  ]
    .filter(Boolean)
    // Khi Thống kê là gốc danh mục (REACT_APP_TK_EMBED): ẩn các mục danh mục đã
    // chuyển sang Thống kê — đơn vị, chức danh, ca (cả mục "Phân loại/Chủng loại
    // thiết bị" trong submenu Thiết bị). Màn vận hành xe/máy vẫn giữ.
    .map((it: any) =>
      TK_EMBED && it?.submenu
        ? {
            ...it,
            submenu: it.submenu.filter(
              (s: any) => !CATALOG_PATHS_MOVED_TO_TK.includes(s.path),
            ),
          }
        : it,
    )
    .filter(
      (it: any) => !(TK_EMBED && CATALOG_PATHS_MOVED_TO_TK.includes(it?.path)),
    );


  // ---- Lớp trình bày theo ảnh mẫu: thanh trên xanh đậm + hàng tab trắng ----
  const isActive = (path: string) => location.pathname === path;
  const catalogActive = menuItems.some(
    (it: any) =>
      it &&
      (it.path === location.pathname ||
        it.submenu?.some((s: any) => s.path === location.pathname)),
  );
  const displayName = user?.fullName || user?.username || "";
  const navBtnSx = (active: boolean) => ({
    height: 46,
    px: 2,
    gap: 0.5,
    borderRadius: 0,
    textTransform: "none",
    fontSize: 15,
    fontWeight: 600,
    whiteSpace: "nowrap",
    color: active ? HDR_BLUE : "#334155",
    bgcolor: active ? alpha(HDR_BLUE, 0.1) : "transparent",
    borderBottom: `3px solid ${active ? HDR_BLUE : "transparent"}`,
    "&:hover": { bgcolor: active ? alpha(HDR_BLUE, 0.1) : "#f6f8fb" },
    "& .MuiButton-startIcon": { mr: 0.75 },
  });

  return (
    <ThemeProvider theme={uiSansTheme}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (t) => t.zIndex.appBar,
          fontFamily: UI_FONT,
        }}
      >
        {/* Thanh trên: logo + tên hệ thống + thông báo + tài khoản */}
        <Box
          sx={{
            bgcolor: HDR_BG,
            color: HDR_FG,
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, lg: 2 },
            px: { xs: 1.5, lg: 3 },
            minHeight: { xs: 56, lg: 60 },
          }}
        >
          {isMobile && (
            <>
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                <MenuOpen sx={{ fontSize: 30 }} />
              </IconButton>
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
              >
                <List sx={{ width: 280 }}>
                  <ListItem
                    button
                    onClick={() => {
                      navigate("/");
                      setDrawerOpen(false);
                    }}
                  >
                    <ListItemIcon sx={{ color: "primary.main" }}>
                      <Dashboard />
                    </ListItemIcon>
                    <ListItemText primary="Tổng quan" />
                  </ListItem>
                  <ListItem
                    button
                    onClick={() => {
                      navigate("/orders");
                      setDrawerOpen(false);
                    }}
                  >
                    <ListItemIcon sx={{ color: "primary.main" }}>
                      <ClipboardPaste />
                    </ListItemIcon>
                    <ListItemText primary="Lệnh sản xuất" />
                  </ListItem>
                  {[RoleEnum.MANAGER].includes(user?.role) && (
                    <ListItem
                      button
                      onClick={() => {
                        navigate("/orderByUsers");
                        setDrawerOpen(false);
                      }}
                    >
                      <ListItemIcon sx={{ color: "primary.main" }}>
                        <WorkOutline />
                      </ListItemIcon>
                      <ListItemText primary="Công việc của tôi" />
                    </ListItem>
                  )}
                  {menuItems.map((item: any) => {
                    if (!item) return null;
                    if (item.submenu) {
                      return (
                        <ListItem
                          key={item.text}
                          secondaryAction={<KeyboardArrowRight />}
                          button
                          onClick={(e) => {
                            setSubmenuAnchorEl(e.currentTarget);
                            setSubmenuItems(item.submenu!);
                          }}
                        >
                          <ListItemIcon sx={{ color: "primary.main" }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText primary={item.text} />
                        </ListItem>
                      );
                    }
                    return (
                      <ListItem
                        key={item.text}
                        button
                        onClick={() => {
                          navigate(item.path!);
                          setDrawerOpen(false);
                        }}
                      >
                        <ListItemIcon sx={{ color: "primary.main" }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItem>
                    );
                  })}
                  {TK_EMBED && (
                    <ThongKeNav
                      role={user?.role}
                      variant="drawer"
                      onNavigate={() => setDrawerOpen(false)}
                    />
                  )}
                  {[
                    RoleEnum.ADMIN,
                    RoleEnum.MANAGER,
                    RoleEnum.DISPATCHER,
                  ].includes(user?.role) && (
                    <ListItem
                      button
                      onClick={() => {
                        navigate("/reports");
                        setDrawerOpen(false);
                      }}
                    >
                      <ListItemIcon sx={{ color: "primary.main" }}>
                        <ChartNoAxesCombined color="currentColor" />
                      </ListItemIcon>
                      <ListItemText primary="Báo cáo" />
                    </ListItem>
                  )}
                  {[RoleEnum.ADMIN].includes(user?.role) && (
                    <ListItem
                      button
                      onClick={() => {
                        navigate("/system");
                        setDrawerOpen(false);
                      }}
                    >
                      <ListItemIcon sx={{ color: "primary.main" }}>
                        <MonitorCog color="currentColor" />
                      </ListItemIcon>
                      <ListItemText primary="Hệ thống" />
                    </ListItem>
                  )}
                </List>
              </Drawer>
            </>
          )}
          <img
            src={branding.logoUrl}
            alt="logo"
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              // logo mặc định là huy hiệu tròn; logo tuỳ chỉnh có thể chữ nhật nên không cắt tròn
              borderRadius: branding.hasCustomLogo ? 6 : "50%",
            }}
          />
          {!isMobile && (
            <Box
              sx={{ width: "1px", height: 30, bgcolor: alpha(HDR_FG, 0.28) }}
            />
          )}
          <Box
            sx={{ minWidth: 0 }}
            title="Điện thoại: 024.35180141 · Fax: 024.38510724"
          >
            <Typography
              noWrap
              sx={{
                fontSize: { xs: 13, lg: 17 },
                fontWeight: 800,
                letterSpacing: 0.3,
                lineHeight: 1.25,
              }}
            >
              {branding.headerTitle}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: { xs: 11, lg: 12.5 },
                color: alpha(HDR_FG, 0.82),
                lineHeight: 1.3,
              }}
            >
              {branding.companyName}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />

          {/* Thông báo + tài khoản (giữ nguyên chức năng cũ) */}
          <Tooltip
            title={`Thông báo${notificationCount ? ` (${notificationCount} chưa đọc)` : ""}`}
          >
            <IconButton color="inherit" onClick={() => navigate("/notifications")}>
              <Badge
                variant="dot"
                color="error"
                invisible={!notificationCount}
                overlap="circular"
              >
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>
          <Box
            sx={{ width: "1px", height: 30, bgcolor: alpha(HDR_FG, 0.28) }}
          />
          <Tooltip title="Tài khoản">
            <ButtonBase
              onClick={(e) => setAvatarAnchorEl(e.currentTarget)}
              sx={{
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: "10px",
                color: HDR_FG,
                "&:hover": { bgcolor: alpha(HDR_FG, 0.1) },
              }}
            >
              <Avatar
                src={url}
                sx={{ width: 34, height: 34, bgcolor: "#e2e8f0", color: HDR_NAVY }}
              />
              {!isMobile && (
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  {displayName}
                </Typography>
              )}
              <ExpandMore fontSize="small" />
            </ButtonBase>
          </Tooltip>
        </Box>

        {/* Hàng tab điều hướng (màn rộng); màn hẹp dùng ngăn kéo ở trên */}
        {!isMobile && (
          <Box
            sx={{
              bgcolor: "#fff",
              borderBottom: "1px solid #e5e9f0",
              boxShadow: "0 1px 2px rgba(15,23,42,.05)",
              px: 3,
              display: "flex",
              alignItems: "stretch",
              gap: 0.5,
            }}
          >
            <Button
              color="inherit"
              startIcon={<Dashboard />}
              sx={navBtnSx(isActive("/"))}
              onClick={() => navigate("/")}
            >
              Tổng quan
            </Button>
            <Button
              color="inherit"
              startIcon={<ClipboardPaste size={20} style={{ color: "inherit" }} />}
              sx={navBtnSx(isActive("/orders"))}
              onClick={() => navigate("/orders")}
            >
              Lệnh sản xuất
            </Button>
            {[RoleEnum.MANAGER].includes(user?.role) && (
              <Button
                color="inherit"
                startIcon={<WorkOutline />}
                sx={navBtnSx(isActive("/orderByUsers"))}
                onClick={() => navigate("/orderByUsers")}
              >
                Công việc của tôi
              </Button>
            )}
            {menuItems.length > 0 && (
              <>
                <Button
                  color="inherit"
                  sx={navBtnSx(catalogActive)}
                  onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                  startIcon={<Category />}
                  endIcon={<ExpandMore />}
                >
                  Danh mục
                </Button>
                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={() => setMenuAnchorEl(null)}
                >
                    {menuItems.map((item: any) => {
                      if (!item) return null;
                      if (item.submenu) {
                        return (
                          <MenuItem
                            key={item.text}
                            onClick={(e) => {
                              setSubmenuAnchorEl(e.currentTarget);
                              setSubmenuItems(item.submenu!);
                            }}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              minWidth: 200,
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Box display="flex" color="primary.main">
                                {item.icon}
                              </Box>
                              {item.text}
                            </Box>
                            <KeyboardArrowRight fontSize="small" />
                          </MenuItem>
                        );
                      }
                      return (
                        <MenuItem
                          key={item!.text}
                          sx={{
                            borderLeft:
                              location.pathname === item.path
                                ? `4px solid ${HDR_BLUE}`
                                : "4px solid transparent",
                            display: "flex",
                            gap: 1.5,
                            minWidth: 200,
                          }}
                          onClick={() => {
                            navigate(item!.path!);
                            setMenuAnchorEl(null);
                          }}
                        >
                          <Box display="flex" color="primary.main">
                            {item.icon}
                          </Box>
                          {item!.text}
                        </MenuItem>
                      );
                    })}
                </Menu>
              </>
            )}
            {TK_EMBED && (
              <ThongKeNav role={user?.role} variant="bar" navBtnSx={navBtnSx} />
            )}
            {[RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER].includes(
              user?.role,
            ) && (
              <Button
                color="inherit"
                startIcon={<ChartNoAxesCombined size={20} style={{ color: "inherit" }} />}
                sx={navBtnSx(isActive("/reports"))}
                onClick={() => navigate("/reports")}
              >
                Báo cáo
              </Button>
            )}
            {[RoleEnum.ADMIN].includes(user?.role) && (
              <Button
                color="inherit"
                startIcon={<MonitorCog size={20} style={{ color: "inherit" }} />}
                sx={navBtnSx(isActive("/system"))}
                onClick={() => navigate("/system")}
              >
                Hệ thống
              </Button>
            )}
          </Box>
        )}

            <Popover
              open={Boolean(avatarAnchorEl)}
              anchorEl={avatarAnchorEl}
              onClose={() => setAvatarAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Box padding={2} display="flex" flexDirection="column" gap={1}>
                <Typography variant="h6" align="center">
                  {user?.fullName}
                </Typography>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setOpenProfile(true);
                    setAvatarAnchorEl(null);
                  }}
                >
                  <Person
                    sx={{ marginRight: 1 }}
                    color="primary"
                    fontSize="small"
                  />
                  Thông tin cá nhân
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOpenChangePassword(true);
                    setAvatarAnchorEl(null);
                  }}
                >
                  <VpnKeyOutlined
                    sx={{ marginRight: 1 }}
                    color="primary"
                    fontSize="small"
                  />
                  Đổi mật khẩu
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout
                    sx={{ marginRight: 1 }}
                    color="primary"
                    fontSize="small"
                  />
                  Đăng xuất
                </MenuItem>
              </Box>
            </Popover>
            <Popover
              open={Boolean(submenuAnchorEl)}
              anchorEl={submenuAnchorEl}
              onClose={() => setSubmenuAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "center", horizontal: "left" }}
            >
              <MenuList>
                {submenuItems.map((sub) => (
                  <MenuItem
                    key={sub.text}
                    onClick={() => {
                      navigate(sub?.path);
                      setSubmenuAnchorEl(null);
                      setDrawerOpen(false);
                      setMenuAnchorEl(null);
                    }}
                  >
                    {sub.text}
                  </MenuItem>
                ))}
              </MenuList>
            </Popover>

        {/* Đổi mật khẩu / thông tin cá nhân giữ nguyên theme gốc */}
        <ThemeProvider theme={appFontTheme}>
          <ChangePassword
            open={openChangePassword}
            setOpen={setOpenChangePassword}
          />
          <Profile open={openProfile} setOpen={setOpenProfile} />
        </ThemeProvider>
      </Box>
    </ThemeProvider>
  );
}
