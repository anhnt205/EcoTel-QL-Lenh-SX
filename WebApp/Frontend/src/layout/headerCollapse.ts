import { useSyncExternalStore } from "react";

/**
 * Trạng thái "thu banner": banner phần mềm (logo, tên hệ thống) co về 0, chỉ còn thanh menu — để nhường chỗ cho nội
 * dung. Dùng chung giữa Header (co/giãn banner) và khung nhúng Thống kê (đặt trạng thái khi người dùng lăn chuột
 * TRONG khung, vì lúc đó cả trang Điều phối không cuộn nên không có sự kiện cuộn nào để Header tự biết).
 */
let collapsed = false;
const subscribers = new Set<() => void>();

export const setHeaderCollapsed = (value: boolean) => {
  if (value === collapsed) return;
  collapsed = value;
  subscribers.forEach((fn) => fn());
};

export const useHeaderCollapsed = (): boolean =>
  useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    () => collapsed,
  );

/**
 * Chế độ menu: CHƯA kéo => thanh menu NGANG (cùng banner); ĐÃ kéo => thanh menu DỌC (banner + hàng nút ngang thu
 * đi). Chỉ hiện MỘT trong hai, không hiện đồng thời. "Đã kéo" = Thống kê báo lăn xuống trong khung nhúng
 * (`setHeaderCollapsed`) HOẶC trang Điều phối đã cuộn xuống (`setPageScrolled`, đặt ở Header có độ trễ chống nhấp nháy).
 */
let pageScrolled = false;
const scrolledSubscribers = new Set<() => void>();

export const setPageScrolled = (value: boolean) => {
  if (value === pageScrolled) return;
  pageScrolled = value;
  scrolledSubscribers.forEach((fn) => fn());
};

const usePageScrolled = (): boolean =>
  useSyncExternalStore(
    (cb) => {
      scrolledSubscribers.add(cb);
      return () => {
        scrolledSubscribers.delete(cb);
      };
    },
    () => pageScrolled,
  );

/** true = đang ở chế độ menu DỌC (đã kéo); false = menu NGANG (chưa kéo). */
export const useVerticalNav = (): boolean => {
  const collapsed = useHeaderCollapsed();
  const scrolled = usePageScrolled();
  return collapsed || scrolled;
};
