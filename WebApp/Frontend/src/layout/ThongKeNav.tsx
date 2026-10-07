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
import { ExpandLess, ExpandMore, Assessment } from "@mui/icons-material";
import {
  TK_CATALOG_GROUPS,
  TK_ROUTE_PREFIX,
  TK_TOP_ITEMS,
  tkPageRoute,
  TkMenuGroup,
} from "./thongkeMenu";
import { RoleEnum } from "../enums";

interface Props {
  role?: string;
  /** "bar": nút trên thanh menu rộng; "drawer": danh sách thu gọn trong ngăn kéo di động */
  variant: "bar" | "drawer";
  navBtnSx?: (active: boolean) => object;
  /** gọi sau khi chọn 1 mục (đóng ngăn kéo) */
  onNavigate?: () => void;
}

// Menu "Thống kê" — các mục dẫn tới trang nhúng `/tk/...` (xem EmbeddedThongKe).
const ThongKeNav = ({ role, variant, navBtnSx, onNavigate }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);

  const allowed = [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DISPATCHER].includes(
    role as RoleEnum,
  );
  if (!allowed) return null;

  const isAdmin = role === RoleEnum.ADMIN;
  const active = pathname.startsWith(`${TK_ROUTE_PREFIX}/`) || pathname === TK_ROUTE_PREFIX;
  const groups: TkMenuGroup[] = TK_CATALOG_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  })).filter((g) => g.items.length > 0);

  const go = (to: string) => {
    navigate(tkPageRoute(to));
    setAnchor(null);
    onNavigate?.();
  };
  const selected = (to: string) => pathname === tkPageRoute(to);

  if (variant === "drawer") {
    return (
      <>
        <ListItem button onClick={() => setOpen((v) => !v)}>
          <ListItemIcon sx={{ color: "primary.main" }}>
            <Assessment />
          </ListItemIcon>
          <ListItemText primary="Thống kê" />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          {TK_TOP_ITEMS.map((i) => (
            <ListItem button key={i.to} sx={{ pl: 4 }} selected={selected(i.to)} onClick={() => go(i.to)}>
              <ListItemText primary={i.text} />
            </ListItem>
          ))}
          {groups.map((g) => (
            <div key={g.label}>
              <ListSubheader sx={{ pl: 4, lineHeight: "32px" }}>{g.label}</ListSubheader>
              {g.items.map((i) => (
                <ListItem button key={i.to} sx={{ pl: 6 }} selected={selected(i.to)} onClick={() => go(i.to)}>
                  <ListItemText primary={i.text} />
                </ListItem>
              ))}
            </div>
          ))}
        </Collapse>
      </>
    );
  }

  return (
    <>
      <Button
        color="inherit"
        startIcon={<Assessment />}
        endIcon={<ExpandMore />}
        sx={navBtnSx ? navBtnSx(active) : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Thống kê
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { maxHeight: "75vh", minWidth: 240 } }}
      >
        {TK_TOP_ITEMS.map((i) => (
          <MenuItem key={i.to} selected={selected(i.to)} onClick={() => go(i.to)}>
            {i.text}
          </MenuItem>
        ))}
        {groups.map((g) => [
          <Divider key={`${g.label}-d`} />,
          <ListSubheader key={g.label} sx={{ lineHeight: "32px", bgcolor: "background.paper" }}>
            {g.label}
          </ListSubheader>,
          ...g.items.map((i) => (
            <MenuItem key={i.to} selected={selected(i.to)} sx={{ pl: 3 }} onClick={() => go(i.to)}>
              {i.text}
            </MenuItem>
          )),
        ])}
      </Menu>
    </>
  );
};

export default ThongKeNav;
