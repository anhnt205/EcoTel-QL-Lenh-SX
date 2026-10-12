import { useEffect, useRef } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { TabActiveContext } from "./tab-active-context";
import { useTabStore } from "@/stores/useTabStore";

/**
 * Thay cho `<Outlet/>` thường.
 *
 * `<Outlet/>` chỉ render đúng trang khớp URL, nên đổi trang là trang cũ bị HUỶ
 * sạch — đang nhập dở nửa chừng mà chuyển sang xem màn khác là mất hết, phải
 * nhập lại từ đầu (chủ dự án báo 2026-09-09).
 *
 * Ở đây giữ lại phần tử React của từng trang đã vào, rồi render TẤT CẢ cùng lúc
 * và chỉ ẩn/hiện bằng CSS. Trang bị ẩn vẫn còn sống nguyên trong bộ nhớ nên quay
 * lại là còn đúng những gì đang làm dở: dữ liệu đang gõ, bộ lọc, dòng đang chọn,
 * vị trí trang.
 *
 * Điểm mấu chốt: mỗi đường dẫn chỉ chụp phần tử ĐÚNG MỘT LẦN rồi dùng lại y
 * nguyên phần tử đó ở các lần render sau. Nếu lấy phần tử mới từ `useOutlet()`
 * mỗi lần render thì React coi là cây khác và dựng lại trang từ đầu — mất sạch,
 * đúng thứ đang muốn tránh.
 */
export function KeepAliveOutlet() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const cache = useRef<Map<string, React.ReactNode>>(new Map());

  const entries = useTabStore((s) => s.entries);
  const visit = useTabStore((s) => s.visit);

  if (outlet && !cache.current.has(pathname)) {
    cache.current.set(pathname, outlet);
  }

  useEffect(() => {
    visit(pathname);
  }, [pathname, visit]);

  // Trang đã bị đóng tab / bị dọn LRU thì bỏ khỏi bộ nhớ luôn, không giữ rác.
  const alivePaths = new Set(entries.map((e) => e.path));
  for (const path of cache.current.keys()) {
    if (!alivePaths.has(path) && path !== pathname) {
      cache.current.delete(path);
    }
  }

  return (
    <>
      {[...cache.current.entries()].map(([path, element]) => {
        const isActive = path === pathname;
        return (
          <div key={path} hidden={!isActive} className={isActive ? "h-full" : undefined}>
            <TabActiveContext.Provider value={isActive}>
              {element}
            </TabActiveContext.Provider>
          </div>
        );
      })}
    </>
  );
}
