import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { isMainTab, mainTabTitle, useTabStore } from "@/stores/useTabStore";

/**
 * Thanh tab các màn làm việc chính — mở nhiều màn cùng lúc, bấm qua lại mà
 * không mất việc đang làm dở.
 *
 * Chỉ hiện tab cho 7 màn chính (xem `MAIN_TABS`). Các trang danh mục lẻ vẫn
 * được giữ sống ngầm để quay lại là còn nguyên dữ liệu, nhưng không hiện lên
 * đây cho khỏi rối. Thanh tự ẩn khi chưa mở màn chính nào.
 */
export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entries = useTabStore((s) => s.entries);
  const close = useTabStore((s) => s.close);

  const tabs = entries.filter((e) => isMainTab(e.path));
  if (tabs.length === 0) return null;

  const handleClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const remaining = tabs.filter((t) => t.path !== path);
    close(path);
    // Đang đứng ở chính tab vừa đóng thì nhảy sang tab còn lại gần nhất.
    if (pathname === path && remaining.length > 0) {
      navigate(remaining[remaining.length - 1].path);
    }
  };

  // Kiểu tab trình duyệt: dải nền XÁM ĐẬM hơn hẳn vùng nội dung, tab đang xem
  // màu nền sáng nổi bật lên khỏi dải. Tab đang xem kéo xuống 1px (`-mb-px`) và
  // tô cạnh dưới cùng màu nền nội dung để "nuốt" đường kẻ chân dải — nhờ vậy
  // tab dính liền vào vùng nội dung đúng như tab Chrome.
  return (
    <div className="flex shrink-0 items-end gap-0.5 overflow-x-auto border-b border-gray-400 bg-gray-300 px-2 pt-1.5 dark:border-gray-800 dark:bg-gray-900">
      {tabs.map((tab) => {
        const isActive = tab.path === pathname;
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            title={mainTabTitle(tab.path)}
            className={`group -mb-px flex max-w-[230px] items-center gap-2 whitespace-nowrap rounded-t-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
              isActive
                ? "border-gray-300 border-b-background bg-background text-blue-700 dark:border-gray-800 dark:text-blue-400"
                : "border-transparent bg-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            <span className="truncate">{mainTabTitle(tab.path)}</span>
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Đóng ${mainTabTitle(tab.path)}`}
              onClick={(e) => handleClose(e, tab.path)}
              className={`rounded p-0.5 text-gray-500 transition-opacity hover:bg-gray-300 hover:text-red-600 dark:hover:bg-gray-700 ${
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
