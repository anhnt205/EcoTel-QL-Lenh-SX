import { create } from "zustand";

/**
 * Sổ đăng ký các modal đang bị THU NHỎ toàn app — chủ dự án chốt 2026-09-10:
 * mọi modal popup cần đủ 3 nút Thu nhỏ/Phóng to/Đóng kiểu cửa sổ hệ điều
 * hành.
 *
 * "Thu nhỏ" trong 1 trang web (khác hẳn multi-window OS) nghĩa là: modal ẩn
 * đi, hiện 1 THANH NHỎ nổi ở góc màn hình ghi rõ đang làm gì, bấm vào mở lại
 * ĐÚNG chỗ đang dở — không mất dữ liệu đang gõ. Trong lúc đó vẫn xem/thao
 * tác được trang phía sau.
 *
 * Bản thân modal KHÔNG bị unmount khi thu nhỏ (chỉ ẩn bằng CSS) — state React
 * bên trong (form đang nhập dở) giữ nguyên. Store này chỉ giữ THÔNG TIN HIỂN
 * THỊ của thanh nổi (tiêu đề) + một hàm `restore` để gọi ngược lại đúng modal
 * đó khi bấm vào thanh.
 */
export interface MinimizedModalEntry {
  id: string;
  title: string;
  restore: () => void;
}

interface ModalWindowState {
  minimized: MinimizedModalEntry[];
  register: (entry: MinimizedModalEntry) => void;
  unregister: (id: string) => void;
}

export const useModalWindowStore = create<ModalWindowState>((set) => ({
  minimized: [],
  register: (entry) =>
    set((state) => ({
      minimized: [...state.minimized.filter((m) => m.id !== entry.id), entry],
    })),
  unregister: (id) =>
    set((state) => ({
      minimized: state.minimized.filter((m) => m.id !== id),
    })),
}));
