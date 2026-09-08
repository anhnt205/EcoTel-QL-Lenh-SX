import React from "react";
import { AlertTriangle, ListFilter } from "lucide-react";

interface EntryStatusTabsProps {
  totalCount: number;
  revisionCount: number;
  showOnlyRevisions: boolean;
  onChange: (showOnlyRevisions: boolean) => void;
}

/**
 * Gom nhóm "X bản ghi cần sửa" thành 1 tab riêng — bấm vào là lọc thẳng
 * bảng xuống chỉ còn các dòng REVISION_REQUESTED, không phải chỉ hiển thị
 * số đếm tĩnh như trước.
 */
export const EntryStatusTabs: React.FC<EntryStatusTabsProps> = ({
  totalCount,
  revisionCount,
  showOnlyRevisions,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
          !showOnlyRevisions
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800"
        }`}
      >
        <ListFilter className="w-3 h-3" />
        <span>Tất cả</span>
        <span
          className={`px-1.5 rounded-full ${
            !showOnlyRevisions
              ? "bg-white/20"
              : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          {totalCount}
        </span>
      </button>

      {revisionCount > 0 && (
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
            showOnlyRevisions
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 animate-pulse"
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Cần sửa</span>
          <span
            className={`px-1.5 rounded-full ${
              showOnlyRevisions
                ? "bg-white/20"
                : "bg-rose-100 dark:bg-rose-900/60"
            }`}
          >
            {revisionCount}
          </span>
        </button>
      )}
    </div>
  );
};
