import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  Box,
  ButtonBase,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Category,
  ChevronLeft,
  ChevronRight,
  Dashboard,
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  Notifications,
  WorkOutline,
} from "@mui/icons-material";
import {
  Calculator,
  ChartNoAxesCombined,
  ClipboardPaste,
  GitCompareArrows,
  MonitorCog,
  Pickaxe,
  Truck,
} from "lucide-react";
import { brandAccent, brandNavy } from "../branding/BrandingProvider";
import { RoleEnum } from "../enums";
import { allowModule, showModule } from "../permissions/access";
import {
  buildMergedCatalog,
  canSeeTkItem,
  TK_NAV_AFTER_CATALOG,
  TK_NAV_BEFORE_CATALOG,
  tkPageRoute,
  TkMenuItem,
} from "./thongkeMenu";
import { setSidebarCollapsed, sidebarWidth, useSidebarCollapsed } from "./sidebarState";
import { useHeaderBottom } from "./headerMetrics";

/**
 * Thanh menu DỌC bên trái (màn rộng, chế độ nhúng Thống kê) — thay thanh menu ngang. Cấu trúc theo ảnh mẫu: nền xanh
 * đậm, mục đang chọn tô màu chủ đạo, mục có nhóm con thì mở/thu (Danh mục > nhóm > từng danh mục). Dùng đúng nguồn menu
 * và quyền như thanh ngang (`thongkeMenu.ts`, `permissions/access`) nên người dùng thấy đúng những mục họ được xem.
 * Có nút thu gọn chỉ còn biểu tượng để nhường chỗ cho nội dung (nhớ lại lựa chọn).
 */

interface Leaf {
  key: string;
  text: string;
  icon: JSX.Element;
  path: string;
}
interface Group {
  key: string;
  text: string;
  icon: JSX.Element;
  /** các nhóm con: mỗi nhóm có nhãn + danh sách mục (Danh mục > Loại hàng > Chủng loại hàng) */
  sections: { label: string; items: { text: string; path: string }[] }[];
}
type Entry = Leaf | Group;
const isGroup = (e: Entry): e is Group => (e as Group).sections !== undefined;

const ICON = 20;
const TK_ICONS: Record<string, JSX.Element> = {
  "/nhap-lieu/khai-thac": <Pickaxe size={ICON} />,
  "/nhap-lieu/van-tai": <Truck size={ICON} />,
  "/nhap-lieu/doi-chieu": <GitCompareArrows size={ICON} />,
  "/bao-cao/thong-ke": <Calculator size={ICON} />,
};

interface SideNavProps {
  user?: any;
  /** tên hiển thị + ảnh đại diện + số thông báo chưa đọc: hiện ở CHÂN thanh menu (banner header chỉ còn thương hiệu) */
  displayName?: string;
  avatarSrc?: string;
  notificationCount?: number;
  onBell?: () => void;
  onAccount?: (anchor: HTMLElement) => void;
  /** chỉ hiện chuông + tài khoản ở chân menu khi banner (nơi chứa chúng) đã thu */
  showAccount?: boolean;
}

const SideNav = ({ user, displayName, avatarSrc, notificationCount = 0, onBell, onAccount, showAccount = false }: SideNavProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const collapsed = useSidebarCollapsed();
  const headerBottom = useHeaderBottom(); // thanh dọc nằm ngay dưới phần header đang hiển thị (banner thu/trôi đi khi cuộn)
  const ACCENT = brandAccent(theme.palette.primary.main);
  const NAVY = brandNavy(theme.palette.primary.main);

  const onPath = (p: string) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`));

  const tkLeaf = (i: TkMenuItem): Leaf => {
    const path = i.route ?? tkPageRoute(i.to);
    return { key: path, text: i.text, icon: TK_ICONS[i.to] ?? <Category />, path };
  };

  const entries: Entry[] = [];
  if (showModule(user, "dashboard")) entries.push({ key: "/", text: "Tổng quan", icon: <Dashboard />, path: "/" });
  if (showModule(user, "orders"))
    entries.push({ key: "/orders", text: "Lệnh sản xuất", icon: <ClipboardPaste size={ICON} />, path: "/orders" });
  if (allowModule(user, "my-tasks", [RoleEnum.MANAGER]))
    entries.push({ key: "/orderByUsers", text: "Công việc của tôi", icon: <WorkOutline />, path: "/orderByUsers" });
  TK_NAV_BEFORE_CATALOG.filter((i) => canSeeTkItem(user, i)).forEach((i) => entries.push(tkLeaf(i)));
  const catalog = buildMergedCatalog(user);
  if (catalog.length > 0) {
    entries.push({
      key: "catalog",
      text: "Danh mục",
      icon: <Category />,
      sections: catalog.map((g) => ({ label: g.label, items: g.items.map((i) => ({ text: i.text, path: i.path })) })),
    });
  }
  TK_NAV_AFTER_CATALOG.filter((i) => canSeeTkItem(user, i)).forEach((i) => entries.push(tkLeaf(i)));
  if (allowModule(user, "reports", [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER]))
    entries.push({ key: "/reports", text: "Báo cáo", icon: <ChartNoAxesCombined size={ICON} />, path: "/reports" });
  if (allowModule(user, "system", [RoleEnum.ADMIN]))
    entries.push({ key: "/system", text: "Hệ thống", icon: <MonitorCog size={ICON} />, path: "/system" });

  // mục cha / nhóm con đang mở: tự mở nhánh chứa trang hiện tại
  const [openTop, setOpenTop] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  useEffect(() => {
    for (const e of entries) {
      if (!isGroup(e)) continue;
      for (const s of e.sections) {
        if (s.items.some((i) => onPath(i.path))) {
          setOpenTop(e.key);
          setOpenSection(s.label);
          return;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const itemSx = (active: boolean, pl = 2) => ({
    mx: 0,
    mb: "4px",
    py: "13px",
    pl,
    pr: 2,
    borderRadius: "9px",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: active ? "#fff" : "#d8e6fa",
    background: active ? "linear-gradient(100deg,#1465e5,#277ef8)" : "transparent",
    boxShadow: active ? "0 4px 12px #031c4760" : "none",
    "&:hover": { background: active ? "linear-gradient(100deg,#1465e5,#277ef8)" : "#ffffff17" },
    "& .MuiListItemIcon-root": { color: "inherit", minWidth: 35 },
  });

  const leafButton = (e: Leaf) => {
    const active = onPath(e.path);
    const btn = (
      <ListItemButton key={e.key} onClick={() => navigate(e.path)} sx={itemSx(active)}>
        <ListItemIcon>{e.icon}</ListItemIcon>
        {!collapsed && <ListItemText primary={e.text} primaryTypographyProps={{ fontSize: 13, fontWeight: 600, fontFamily: "Arial, Helvetica, sans-serif" }} />}
      </ListItemButton>
    );
    return collapsed ? (
      <Tooltip key={e.key} title={e.text} placement="right">
        {btn}
      </Tooltip>
    ) : (
      btn
    );
  };

  const groupButton = (e: Group) => {
    const open = openTop === e.key && !collapsed;
    const active = e.sections.some((s) => s.items.some((i) => onPath(i.path)));
    const head = (
      <ListItemButton
        onClick={() => {
          if (collapsed) {
            setSidebarCollapsed(false); // bấm biểu tượng nhóm khi đang thu gọn: mở rộng thanh menu để chọn mục con
            setOpenTop(e.key);
          } else {
            setOpenTop(open ? null : e.key);
          }
        }}
        sx={itemSx(active || open)}
      >
        <ListItemIcon>{e.icon}</ListItemIcon>
        {!collapsed && (
          <>
            <ListItemText primary={e.text} primaryTypographyProps={{ fontSize: 13, fontWeight: 600, fontFamily: "Arial, Helvetica, sans-serif" }} />
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </>
        )}
      </ListItemButton>
    );
    return (
      <Box key={e.key}>
        {collapsed ? (
          <Tooltip title={e.text} placement="right">
            {head}
          </Tooltip>
        ) : (
          head
        )}
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ background: "#09234d90", borderRadius: "11px", p: "8px 7px 10px", mt: "6px", mb: "4px" }}>
            {e.sections.map((s) => {
              const secOpen = openSection === s.label;
              return (
                <Box key={s.label}>
                  {/* Tiêu đề nhóm con: bold, chữ #eef6ff, mũi tên mở/thu */}
                  <ListItemButton
                    onClick={() => setOpenSection(secOpen ? null : s.label)}
                    sx={{
                      p: "10px 15px",
                      borderRadius: "7px",
                      color: "#eef6ff",
                      fontFamily: "Arial, Helvetica, sans-serif",
                      "&:hover": { background: "#ffffff14" },
                    }}
                  >
                    <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: 13, fontWeight: 700, fontFamily: "Arial, Helvetica, sans-serif" }} />
                    {secOpen ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
                  </ListItemButton>
                  <Collapse in={secOpen} timeout="auto" unmountOnExit>
                    {s.items.map((i) => {
                      const a = onPath(i.path);
                      return (
                        <ListItemButton
                          key={i.path}
                          onClick={() => navigate(i.path)}
                          sx={{
                            position: "relative",
                            p: "11px 12px 11px 32px",
                            m: "2px 0",
                            borderRadius: "7px",
                            fontFamily: "Arial, Helvetica, sans-serif",
                            color: a ? "#fff" : "#cfdef6",
                            background: a ? "#2677ef" : "transparent",
                            "&:hover": { background: a ? "#2677ef" : "#ffffff14" },
                            "&::before": a
                              ? { content: '""', position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "#fff", left: 15, top: "50%", transform: "translateY(-50%)" }
                              : undefined,
                          }}
                        >
                          <ListItemText
                            primary={i.text}
                            primaryTypographyProps={{ fontSize: 13, fontWeight: a ? 700 : 400, noWrap: true, fontFamily: "Arial, Helvetica, sans-serif" }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <Box
      component="nav"
      aria-label="Menu chính"
      sx={{
        position: "fixed",
        left: 0,
        top: headerBottom,
        bottom: 0,
        width: sidebarWidth(collapsed),
        background: "linear-gradient(165deg,#092c63 0%,#092a5c 57%,#0c3979 100%)",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 13,
        color: "#cbd5e1",
        display: "flex",
        flexDirection: "column",
        zIndex: (t) => t.zIndex.appBar - 1,
        transition: "width .2s ease",
        overflow: "hidden",
      }}
    >
      {/* Hình núi mờ ở chân menu (3 vệt gradient theo thiết kế) */}
      {!collapsed && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 85,
            opacity: 0.2,
            pointerEvents: "none",
            background:
              "linear-gradient(160deg,transparent 45%,#3698ff 45% 47%,transparent 47%),linear-gradient(25deg,transparent 40%,#3684db 40% 46%,transparent 46%),linear-gradient(140deg,transparent 56%,#3d98ec 56% 60%,transparent 60%)",
          }}
        />
      )}
      {/* Nút thu gọn / mở rộng ở ĐẦU thanh menu (nút mũi tên nhỏ ở chân menu vẫn còn, cùng trạng thái) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 0.5 : "20px",
          pt: 1,
          pb: 0.25,
          position: "relative",
          zIndex: 1,
          flex: "none",
        }}
      >
        {!collapsed && (
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: "#9db7e0", fontFamily: "Arial, Helvetica, sans-serif" }}>
            MENU
          </Typography>
        )}
        <Tooltip title={collapsed ? "Mở rộng menu" : "Thu gọn menu"} placement="right">
          <IconButton
            size="small"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            aria-expanded={!collapsed}
            onClick={() => setSidebarCollapsed(!collapsed)}
            sx={{
              color: "#e2e8f0",
              bgcolor: alpha("#fff", 0.1),
              "&:hover": { bgcolor: alpha("#fff", 0.2) },
            }}
          >
            {collapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <List sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: "6px 12px 28px", position: "relative", scrollbarWidth: "thin" }}>
        {entries.map((e) => (isGroup(e) ? groupButton(e) : leafButton(e)))}
      </List>
      {/* Chân menu: thông báo + tài khoản — chỉ khi banner (nơi chứa chúng) đã thu */}
      {showAccount && (
      <Box
        sx={{
          borderTop: `1px solid ${alpha("#fff", 0.12)}`,
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.75,
        }}
      >
        <Tooltip title={`Thông báo${notificationCount ? ` (${notificationCount} chưa đọc)` : ""}`} placement="right">
          <IconButton size="small" sx={{ color: "#cbd5e1" }} onClick={onBell}>
            <Badge variant="dot" color="error" invisible={!notificationCount} overlap="circular">
              <Notifications fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title={displayName || "Tài khoản"} placement="right">
          <ButtonBase
            onClick={(e) => onAccount?.(e.currentTarget)}
            sx={{
              gap: 1,
              px: 0.75,
              py: 0.5,
              borderRadius: "8px",
              color: "#e2e8f0",
              flex: collapsed ? undefined : 1,
              minWidth: 0,
              justifyContent: "flex-start",
              "&:hover": { bgcolor: alpha("#fff", 0.08) },
            }}
          >
            <Avatar src={avatarSrc} sx={{ width: 28, height: 28, bgcolor: "#e2e8f0", color: NAVY }} />
            {!collapsed && (
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
                {displayName}
              </Typography>
            )}
          </ButtonBase>
        </Tooltip>
      </Box>
      )}
      <Box sx={{ borderTop: "1px solid #ffffff1c", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 1, p: collapsed ? 0.5 : "6px 12px 6px 20px", position: "relative", zIndex: 1 }}>
        {!collapsed && <Typography sx={{ fontSize: 12, color: "#b7cbea", fontFamily: "Arial, Helvetica, sans-serif" }}>© 2026 Công ty CP Than Cao Sơn - TKV</Typography>}
        <Tooltip title={collapsed ? "Mở rộng menu" : "Thu gọn menu"} placement="right">
          <IconButton size="small" sx={{ color: "#cbd5e1" }} onClick={() => setSidebarCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SideNav;
