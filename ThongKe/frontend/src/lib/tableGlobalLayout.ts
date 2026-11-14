import { useSyncExternalStore } from "react";

/**
 * Cài đặt hiển thị bảng DÙNG CHUNG cho TẤT CẢ bảng (lưu ở trình duyệt, phát tới mọi bảng đang mở ngay lập tức):
 *  - `scale`: kéo thanh trượt "cỡ cột tất cả bảng" (50–200%) — nhân với bề rộng cột của MỌI bảng cùng lúc.
 *  - `applyAll`: bật thì kiểu cột + chiều cao hàng chọn ở nút "Hiển thị bảng" áp cho mọi bảng (thay vì chỉ bảng đang mở).
 * Dùng bởi cả hai bộ điều chỉnh bảng: `modules/catalog/design/tableLayout.tsx` và `components/table/useTanstackLayout.tsx`.
 */
export type GlobalColPreset = "fit" | "compact" | "wide" | "equal";
export type GlobalRowPreset = "compact" | "normal" | "tall";

export interface GlobalTableLayout {
  applyAll: boolean;
  colPreset: GlobalColPreset;
  rowPreset: GlobalRowPreset;
  /** % nhân bề rộng cột của mọi bảng (100 = nguyên bản) */
  scale: number;
  /** dấu thời gian lần "áp kiểu cột cho tất cả bảng" gần nhất — để từng bảng biết mình đã áp chưa (không ghi đè cột đã tự kéo mỗi lần mở lại) */
  rev: number;
}

export const SCALE_MIN = 50;
export const SCALE_MAX = 200;
const KEY = "tk-table-layout-global";
const DEFAULT: GlobalTableLayout = { applyAll: false, colPreset: "fit", rowPreset: "normal", scale: 100, rev: 0 };

const clampScale = (n: number) => Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(n)));

function read(): GlobalTableLayout {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<GlobalTableLayout>;
    return {
      applyAll: p.applyAll === true,
      colPreset: (["fit", "compact", "wide", "equal"] as const).includes(p.colPreset as GlobalColPreset) ? (p.colPreset as GlobalColPreset) : "fit",
      rowPreset: (["compact", "normal", "tall"] as const).includes(p.rowPreset as GlobalRowPreset) ? (p.rowPreset as GlobalRowPreset) : "normal",
      scale: typeof p.scale === "number" ? clampScale(p.scale) : 100,
      rev: typeof p.rev === "number" ? p.rev : 0,
    };
  } catch {
    return DEFAULT;
  }
}

let state: GlobalTableLayout = read();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function setGlobalTableLayout(patch: Partial<GlobalTableLayout>) {
  const bump = patch.colPreset !== undefined || patch.applyAll === true;
  state = { ...state, ...patch, scale: clampScale(patch.scale ?? state.scale), rev: bump ? Date.now() : state.rev };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // trình duyệt chặn lưu: vẫn dùng được trong phiên
  }
  notify();
}

export const resetGlobalTableLayout = () => setGlobalTableLayout(DEFAULT);

if (typeof window !== "undefined") {
  // đổi ở tab khác cũng cập nhật tab này
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = read();
    notify();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useGlobalTableLayout = (): GlobalTableLayout => useSyncExternalStore(subscribe, () => state, () => state);
