import { Progress } from "@/components/ui/progress";
import { Plus, X } from "lucide-react";

interface SessionLike {
  _tempId: string;
}

interface SessionTabsBarProps<T extends SessionLike> {
  sessions: T[];
  activeIdx: number;
  batchProgress: { validCount: number; totalCount: number };
  isSessionValid: (i: number) => boolean;
  getSessionProgress: (i: number) => number;
  onSelect: (i: number) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  renderExtraLabel?: (session: T) => string; // vd: Mining hiện thêm "– excavator"
  progressLabel?: string; // Mining: "Tiến độ nhập:", Transport: "Tiến độ nhập lô:"
}

export function SessionTabsBar<T extends SessionLike>({
  sessions,
  activeIdx,
  batchProgress,
  isSessionValid,
  getSessionProgress,
  onSelect,
  onRemove,
  onAdd,
  renderExtraLabel,
  progressLabel = "Tiến độ nhập:",
}: SessionTabsBarProps<T>) {
  return (
    <>
      <div className="flex items-center justify-between text-xs gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-700 dark:text-gray-200 text-[11px]">
            {progressLabel}
          </span>
          <span className="font-medium text-gray-500 dark:text-gray-400 text-[11px]">
            <strong className="text-blue-700 dark:text-blue-400 font-bold">
              {batchProgress.validCount}
            </strong>
            /{batchProgress.totalCount} bản ghi đã hợp lệ
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
        {sessions.map((s, i) => {
          const isValid = isSessionValid(i);
          const isActive = i === activeIdx;
          const progress = getSessionProgress(i);

          return (
            <div key={s._tempId} className="flex items-center group shrink-0">
              <button
                onClick={() => onSelect(i)}
                className={`flex flex-col gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap min-w-[140px] ${
                  isActive
                    ? "border-blue-500 text-blue-900 dark:text-blue-200 bg-white dark:bg-gray-950 shadow-md ring-2 ring-blue-400/20"
                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isValid
                        ? "bg-blue-500 shadow-xs shadow-blue-500"
                        : "bg-amber-400 animate-pulse"
                    }`}
                    title={isValid ? "Đã hợp lệ" : "Chưa hoàn thành thông tin"}
                  />
                  <span>
                    Bản ghi {i + 1}
                    {renderExtraLabel ? renderExtraLabel(s) : ""}
                  </span>
                </div>

                <Progress
                  value={progress}
                  className={`h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 ${
                    isValid ? "[&>div]:bg-blue-500" : "[&>div]:bg-amber-500"
                  }`}
                />
              </button>

              {sessions.length > 1 && (
                <button
                  onClick={() => onRemove(i)}
                  title="Xóa bản ghi này"
                  className="ml-3.5 mr-2 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all opacity-80 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={onAdd}
          className="px-4 py-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-all flex items-center gap-1.5 border border-dashed border-blue-400 dark:border-blue-700 shrink-0 shadow-2xs"
        >
          <Plus className="w-4 h-4" /> Thêm bản ghi
        </button>
      </div>
    </>
  );
}
