import { useSyncExternalStore } from "react";

/**
 * Mép DƯỚI của phần header đang hiển thị (px, theo khung nhìn). Banner thu/trôi đi khi cuộn nên chiều cao header
 * đổi liên tục; thanh menu dọc (SideNav, đứng cố định) bám theo giá trị này để luôn nằm ngay dưới header.
 */
let bottom = 0;
const subscribers = new Set<() => void>();

export const setHeaderBottom = (value: number) => {
  if (value === bottom) return;
  bottom = value;
  subscribers.forEach((fn) => fn());
};

export const useHeaderBottom = (): number =>
  useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    () => bottom,
  );
