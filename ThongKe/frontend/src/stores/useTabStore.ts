import { create } from "zustand";

/**
 * Các màn LÀM VIỆC CHÍNH — được hiện thành tab trên thanh tab, đóng/mở bằng tay
 * và KHÔNG bao giờ bị tự dọn. Chủ dự án chốt 2026-09-09: chỉ 7 màn này có tab,
 * các trang danh mục lẻ vẫn giữ dữ liệu nhập dở nhưng không làm rối thanh tab.
 */
export const MAIN_TABS: { path: string; title: string }[] = [
  { path: "/nhap-lieu/khai-thac", title: "Nhập liệu Khai thác" },
  { path: "/nhap-lieu/van-tai", title: "Nhập liệu Vận tải" },
  { path: "/nhap-lieu/doi-chieu", title: "Đối chiếu" },
  { path: "/nhap-lieu/bao-chuyen", title: "Báo chuyến" },
  { path: "/bao-cao/thong-ke", title: "Báo cáo thống kê" },
  { path: "/danh-muc/ap-tracdia", title: "Áp Trắc Địa" },
  { path: "/danh-muc/dinh-muc-nhien-lieu", title: "Định mức nhiên liệu" },
];

const MAIN_TAB_PATHS = new Set(MAIN_TABS.map((t) => t.path));

export const isMainTab = (path: string) => MAIN_TAB_PATHS.has(path);

export const mainTabTitle = (path: string) =>
  MAIN_TABS.find((t) => t.path === path)?.title ?? path;

/**
 * Số trang PHỤ (danh mục lẻ) được giữ sống cùng lúc. Giữ sống nghĩa là trang
 * vẫn nằm trong bộ nhớ nên quay lại là còn nguyên dữ liệu đang nhập dở — nhưng
 * giữ vô hạn thì mở nhiều trang sẽ phình bộ nhớ và các truy vấn nền cứ chạy,
 * nên chỉ giữ vài trang gần nhất (LRU).
 */
const MAX_SECONDARY_ALIVE = 3;

interface TabEntry {
  path: string;
  /** Mốc thời gian lần cuối trang này được mở/xem — dùng để dọn LRU. */
  lastUsedAt: number;
}

interface TabState {
  /** Các trang đang được GIỮ SỐNG (gồm cả màn chính lẫn trang phụ). */
  entries: TabEntry[];
  activePath: string | null;
  /** Gọi mỗi khi điều hướng tới một trang. */
  visit: (path: string) => void;
  /** Đóng 1 tab — trang bị huỷ, dữ liệu nhập dở của nó mất theo (đúng ý nghĩa "đóng"). */
  close: (path: string) => void;
  /** Đóng tất cả trừ 1 trang. */
  closeOthers: (keepPath: string) => void;
}

export const useTabStore = create<TabState>((set) => ({
  entries: [],
  activePath: null,

  visit: (path) =>
    set((state) => {
      const now = Date.now();
      const existing = state.entries.find((e) => e.path === path);
      const entries = existing
        ? state.entries.map((e) =>
            e.path === path ? { ...e, lastUsedAt: now } : e,
          )
        : [...state.entries, { path, lastUsedAt: now }];

      // Dọn bớt trang PHỤ theo LRU; màn chính không bao giờ bị dọn tự động.
      const secondary = entries
        .filter((e) => !isMainTab(e.path) && e.path !== path)
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
      const doomed = new Set(
        secondary.slice(Math.max(0, MAX_SECONDARY_ALIVE - 1)).map((e) => e.path),
      );

      return {
        entries: entries.filter((e) => !doomed.has(e.path)),
        activePath: path,
      };
    }),

  close: (path) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.path !== path),
      activePath: state.activePath === path ? null : state.activePath,
    })),

  closeOthers: (keepPath) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.path === keepPath),
      activePath: keepPath,
    })),
}));
