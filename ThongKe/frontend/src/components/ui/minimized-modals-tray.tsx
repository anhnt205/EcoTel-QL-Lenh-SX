import { Maximize2 } from "lucide-react";
import { useModalWindowStore } from "@/stores/useModalWindowStore";

/**
 * Dải thanh nổi góc dưới phải, mỗi thanh là 1 modal đang bị thu nhỏ — bấm
 * vào là mở lại đúng chỗ đang dở. Đặt Ở CẤP APP (ngoài mọi route/trang) để
 * còn hiện được dù người dùng đã chuyển sang tab/trang khác trong lúc modal
 * đang thu nhỏ.
 *
 * z-[110] — cao hơn overlay/modal khác (z-[100], xem `components/ui/dialog.tsx`)
 * vì thanh này phải luôn bấm được kể cả khi có modal khác đang mở đè lên.
 */
export function MinimizedModalsTray() {
  const minimized = useModalWindowStore((s) => s.minimized);

  if (minimized.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[110] flex flex-col-reverse gap-2">
      {minimized.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={m.restore}
          title={`Mở lại: ${m.title}`}
          className="flex max-w-[280px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-800 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="truncate">{m.title}</span>
        </button>
      ))}
    </div>
  );
}
