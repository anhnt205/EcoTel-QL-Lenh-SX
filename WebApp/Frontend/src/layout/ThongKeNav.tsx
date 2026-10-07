import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Collapse,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
} from "@mui/material";
import { Category, ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Calculator,
  FileCheck,
  GitCompareArrows,
  Grid3x3,
  Pickaxe,
  Ruler,
  Truck,
} from "lucide-react";
import {
  buildMergedCatalog,
  canSeeTkModule,
  MergedCatalogItem,
  TK_NAV_AFTER_CATALOG,
  TK_NAV_BEFORE_CATALOG,
  TkMenuItem,
  tkPageRoute,
} from "./thongkeMenu";

// Biểu tượng cho các mục Thống kê đứng ngoài thanh menu (theo PM Thống kê).
const ICONS: Record<string, JSX.Element> = {
  "/nhap-lieu/khai-thac": <Pickaxe size={20} style={{ color: "inherit" }} />,
  "/nhap-lieu/van-tai": <Truck size={20} style={{ color: "inherit" }} />,
  "/danh-muc/dinh-muc-nhien-lieu": <Grid3x3 size={20} style={{ color: "inherit" }} />,
  "/danh-muc/ap-tracdia": <Ruler size={20} style={{ color: "inherit" }} />,
  "/nhap-lieu/doi-chieu": <GitCompareArrows size={20} style={{ color: "inherit" }} />,
  "/nhap-lieu/bao-chuyen": <FileCheck size={20} style={{ color: "inherit" }} />,
  "/bao-cao/thong-ke": <Calculator size={20} style={{ color: "inherit" }} />,
};

interface Props {
  /** người dùng hiện tại (kết quả /auth/me: role, permissionMode, permissions) */
  user?: any;
  /** "bar": các nút trên thanh menu rộng; "drawer": danh sách thu gọn trong ngăn kéo di động */
  variant: "bar" | "drawer";
  navBtnSx?: (active: boolean) => object;
  /** gọi sau khi chọn 1 mục (đóng ngăn kéo) */
  onNavigate?: () => void;
}

// Thanh menu Thống kê khi nhúng: các mục Thống kê đứng NGOÀI (nhập liệu, định mức, áp
// trắc địa, đối chiếu, báo chuyến, báo cáo), còn "Danh mục" là MỘT menu duy nhất gộp
// danh mục Thống kê với danh mục Điều phối. Mục Thống kê dẫn tới trang nhúng `/tk/...`.
const ThongKeNav = ({ user, variant, navBtnSx, onNavigate }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);

  // chỉ hiện các mục người dùng có quyền Xem (đã cấu hình quyền mới) hoặc theo vai trò cũ (chưa cấu hình)
  const before = TK_NAV_BEFORE_CATALOG.filter((i) => canSeeTkModule(user, i.module));
  const after = TK_NAV_AFTER_CATALOG.filter((i) => canSeeTkModule(user, i.module));
  const groups = buildMergedCatalog(user);
  if (before.length === 0 && after.length === 0 && groups.length === 0) return null;

  const go = (path: string) => {
    navigate(path);
    setAnchor(null);
    onNavigate?.();
  };
  const onPath = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const catalogActive = groups.some((g) => g.items.some((i) => onPath(i.path)));
  // Nút thu gọn hơn cho thanh menu dài (nhiều mục hơn bản gốc của Điều phối).
  const compact = (active: boolean) => ({
    ...(navBtnSx ? navBtnSx(active) : {}),
    px: 1.25,
    fontSize: 14,
  });

  const topButton = (i: TkMenuItem) => {
    const path = tkPageRoute(i.to);
    return (
      <Button
        key={i.to}
        color="inherit"
        startIcon={ICONS[i.to]}
        sx={compact(onPath(path))}
        onClick={() => go(path)}
      >
        {i.text}
      </Button>
    );
  };

  const catalogItem = (i: MergedCatalogItem, pl: number) => (
    <MenuItem key={i.path} selected={onPath(i.path)} sx={{ pl }} onClick={() => go(i.path)}>
      {i.text}
    </MenuItem>
  );

  if (variant === "drawer") {
    const drawerTop = (i: TkMenuItem) => (
      <ListItem button key={i.to} selected={onPath(tkPageRoute(i.to))} onClick={() => go(tkPageRoute(i.to))}>
        <ListItemIcon sx={{ color: "primary.main" }}>{ICONS[i.to]}</ListItemIcon>
        <ListItemText primary={i.text} />
      </ListItem>
    );
    return (
      <>
        {before.map(drawerTop)}
        {groups.length > 0 && (
          <>
            <ListItem button onClick={() => setOpen((v) => !v)}>
              <ListItemIcon sx={{ color: "primary.main" }}>
                <Category />
              </ListItemIcon>
              <ListItemText primary="Danh mục" />
              {open ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
              {groups.map((g) => (
                <div key={g.label}>
                  <ListSubheader sx={{ pl: 4, lineHeight: "32px" }}>{g.label}</ListSubheader>
                  {g.items.map((i) => (
                    <ListItem button key={i.path} sx={{ pl: 6 }} selected={onPath(i.path)} onClick={() => go(i.path)}>
                      <ListItemText primary={i.text} />
                    </ListItem>
                  ))}
                </div>
              ))}
            </Collapse>
          </>
        )}
        {after.map(drawerTop)}
      </>
    );
  }

  return (
    <>
      {before.map(topButton)}
      {groups.length > 0 && (
        <>
          <Button
            color="inherit"
            startIcon={<Category />}
            endIcon={<ExpandMore />}
            sx={compact(catalogActive)}
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            Danh mục
          </Button>
          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
            PaperProps={{ sx: { maxHeight: "75vh", minWidth: 300 } }}
          >
            {groups.map((g, idx) => [
              idx > 0 ? <Divider key={`${g.label}-d`} /> : null,
              <ListSubheader key={g.label} sx={{ lineHeight: "32px", bgcolor: "background.paper" }}>
                {g.label}
              </ListSubheader>,
              ...g.items.map((i) => catalogItem(i, 3)),
            ])}
          </Menu>
        </>
      )}
      {after.map(topButton)}
    </>
  );
};

export default ThongKeNav;
