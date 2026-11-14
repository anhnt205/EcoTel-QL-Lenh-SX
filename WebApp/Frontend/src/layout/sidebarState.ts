import { useSyncExternalStore } from "react";

/**
 * Trạng thái thanh menu dọc bên trái (màn rộng, chế độ nhúng Thống kê): mở rộng (chữ + biểu tượng) hay thu gọn (chỉ
 * biểu tượng). Dùng chung giữa SideNav (vẽ thanh menu) và MainLayout (chừa lề trái cho nội dung); nhớ lại qua
 * localStorage để lần sau mở lên giữ nguyên lựa chọn.
 */
export const SIDEBAR_W = 260;
export const SIDEBAR_COLLAPSED_W = 68;


const KEY = "dpmm.sidebar.collapsed";
const read = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

let collapsed = read();
const subscribers = new Set<() => void>();

export const setSidebarCollapsed = (value: boolean) => {
  if (value === collapsed) return;
  collapsed = value;
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* bỏ qua: chỉ mất việc nhớ lựa chọn */
  }
  subscribers.forEach((fn) => fn());
};

export const useSidebarCollapsed = (): boolean =>
  useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    () => collapsed,
  );

export const sidebarWidth = (isCollapsed: boolean) => (isCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W);
